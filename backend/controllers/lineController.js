const mongoose = require('mongoose');
const Line = require('../models/Line');
const ScanLog = require('../models/ScanRecord');
const Output = require('../models/Output');
const User = require('../models/User');
const ModelCode = require('../models/ModelCode');
const { encryptSerial, decryptSerial, hashSerial } = require('../utils/serialCrypto');
const { getMalaysiaTime, formatMalaysiaTime, getMalaysiaShiftEnd } = require('../utils/timeHelper');

// Utility function
const calculateCurrentEfficiency = (line) => {
  if (!line.startTime) return 0;
  const now = getMalaysiaTime();
  const start = line.startTime;
  
  // Get precise minutes with 2 decimal places
  const elapsedMinutes = Math.max(((now - start) / 60000), 0.01); // Prevent division by zero
  const efficiency = (line.totalOutputs || 0) / elapsedMinutes;

  return Number(efficiency.toFixed(2)); // outputs per minute
};

const calculateTargetEfficiency = (line, _shiftStartHour = 8, _shiftStartMinute = 15, shiftEndHour = 19, shiftEndMinute = 45) => {
  const now = new Date(
    new Date().toISOString().replace('Z', '-08:00') // Force MYT timezone
  );

  // Define shift end time
  const shiftEnd = getMalaysiaShiftEnd(shiftEndHour, shiftEndMinute);

  // If current time is past shift end, return 0
  if (now >= shiftEnd) {
    return 0;
  }

  // If line hasn't started, return 0
  if (!line.startTime) {
    return 0;
  }

  const lineStartTime = new Date(line.startTime);

  // If line started after shift end, return 0
  if (lineStartTime >= shiftEnd) {
    return 0;
  }

  // Calculate remaining outputs and time
  const remainingOutputs = Math.max(line.targetOutputs - (line.totalOutputs || 0), 0);
  const remainingMinutes = Math.max((shiftEnd - now) / (60 * 1000), 1);

  // Calculate required rate
  const requiredRate = Number((remainingOutputs / remainingMinutes).toFixed(4));

  // Calculate baseline rate (total available time from line start to shift end)
  const totalAvailableMinutes = (shiftEnd - lineStartTime) / (60 * 1000);
  const baselineRate = Number((line.targetOutputs / totalAvailableMinutes).toFixed(4));

  // Final comparison
  const finalRate = remainingOutputs <= 0 ? 0 : Math.max(baselineRate, requiredRate);
  return finalRate;
};

// Create a production line
const createLine = async (req, res) => {
  try {
    const { name, department, operatorIds } = req.body;
    if (!name || !department || !operatorIds || !operatorIds.length) {
      return res.status(400).json({ message: 'Line name, department, and operators are required.' });
    }
    const newLine = new Line({
      name,
      department,
      operatorIds,
      linestatus: 'STOPPED'
    });
    await newLine.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('newLine', {
        name: newLine.name,
        operatorIds: newLine.operatorIds,
        department: newLine.department,
      });
    }
    return res.status(201).json({ message: 'Production line created', line: newLine });
  } catch (error) {
    console.error('Error creating line:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Update a line's status
const updateLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    const { status } = req.body;

    const line = await Line.findById(lineId);
    if (!line) {
      return res.status(404).json({ message: 'Line not found' });
    }

    if (status != null) line.linestatus = status;
    await line.save();

    return res.status(200).json({ message: 'Line updated', line });
  } catch (error) {
    console.error('Error updating line:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Scan a serial number
const scanSerial = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { lineId } = req.params;
    const { serialNumber, serialStatus, serialNumbers } = req.body;
    const operatorId = req.user.id;
    const isBatch = Array.isArray(serialNumbers);
    const scansToProcess = isBatch ? serialNumbers : [{ serialNumber, serialStatus }];
    const malaysiaNow = getMalaysiaTime();

    // Validate for single scan
    if (!isBatch && (!serialNumber || typeof serialNumber !== 'string' || serialNumber.trim() === '')) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Valid serial number is required." });
    }

    const line = await Line.findById(lineId).session(session);
    if (!line) { await session.abortTransaction(); session.endSession(); return res.status(404).json({ message: "Production line not found." }); }
    const user = await User.findById(operatorId);
    if (!user) { await session.abortTransaction(); session.endSession(); return res.status(401).json({ message: "User not found" }); }

    // Pre-fetch all existing (serialNumberHash + serialStatus)
    const allLookups = scansToProcess.map(({ serialNumber, serialStatus }) => ({
      serialNumberHash: hashSerial(serialNumber.trim()),
      serialStatus
    }));
    const existingScans = await ScanLog.find({ $or: allLookups }).session(session);

    // Also get all existing scans for these serial hashes for 2nd verification logic
    const allSerialHashes = Array.from(new Set(scansToProcess.map(s => hashSerial(s.serialNumber.trim()))));
    const existingByHash = await ScanLog.find({
      serialNumberHash: { $in: allSerialHashes }
    }).session(session);

    // Lookup for (serialNumberHash, serialStatus) to block duplicates
    const existingSet = new Set(existingScans.map(scan => `${scan.serialNumberHash}_${scan.serialStatus}`));
    // Lookup all existing scans for 2nd verification by hash
    const byHashMap = {};
    existingByHash.forEach(scan => {
      byHashMap[scan.serialNumberHash] = scan;
    });

    let totalPassed = 0;
    let totalRejected = 0;
    let netOutputDelta = 0;
    const scanResults = [];
    const failedScans = [];

    for (const { serialNumber, serialStatus } of scansToProcess) {
      if (!serialNumber || typeof serialNumber !== 'string' || serialNumber.trim() === '') {
        failedScans.push({ serialNumber: serialNumber || 'N/A', reason: "Invalid serial number format", status: "INVALID" });
        continue;
      }

      const plainSerial = serialNumber.trim();
      const encSerial = encryptSerial(plainSerial);
      const serialHash = hashSerial(plainSerial);
      const key = `${serialHash}_${serialStatus}`;
      const existingByHashRecord = byHashMap[serialHash];

      // --- Model detection ---
      let detectedModel, code;
      if (plainSerial.length >= 6) {
        code = plainSerial.slice(0, 6);
        const modelCodeDoc = await ModelCode.findOne({ code });
        if (modelCodeDoc) detectedModel = modelCodeDoc.modelName;
      }
      if (!detectedModel) {
        failedScans.push({ serialNumber, reason: "Model not found for serial prefix", status: "MODEL_NOT_FOUND" });
        continue;
      }

      // --- Stage 1: First scan logic (save only if this serial+status doesn't already exist) ---
      if (!existingByHashRecord || (existingByHashRecord && existingByHashRecord.verificationStage === 1 && !existingSet.has(key))) {
        // First verification logic
        if (!line.operatorIds.map(String).includes(operatorId) || user.role !== 'operator') {
          failedScans.push({
            serialNumber,
            reason: "Only assigned line operators can perform first scan.",
            status: "NOT_OPERATOR"
          });
          continue;
        }

        // Only save if this combination doesn't already exist
        if (existingSet.has(key)) {
          failedScans.push({
            serialNumber,
            reason: "Duplicate: This serial number and status already exist.",
            status: "DUPLICATE"
          });
          continue;
        }

        scanResults.push(new ScanLog({
          productionLine: lineId,
          model: detectedModel,
          operator: operatorId,
          name: user.name,
          serialNumber: encSerial,
          serialNumberHash: serialHash,
          serialStatus,
          scannedAt: malaysiaNow,
          verificationStage: 1,
          verifiedBy: null,
          finalScanTime: null,
          secondSerialStatus: null,
          secondVerifierName: null
        }));
        existingSet.add(key);

        if (serialStatus === 'PASS') {
          totalPassed++;
          netOutputDelta++;
          await Output.create([{ lineId, timestamp: malaysiaNow, count: 1 }], { session });
        } else {
          totalRejected++;
        }
        continue;
      }

      // --- Stage 2: Second scan logic (if already exists and is PASS, allow second verification) ---
      if (existingByHashRecord && existingByHashRecord.verificationStage === 1 && existingByHashRecord.serialStatus === 'PASS') {
        // Only PDQC operators can verify at second station
        if (user.role !== 'PDQC operator' && user.role !== 'pdqc') {
          failedScans.push({
            serialNumber,
            reason: "Only PDQC operators can perform second station verification.",
            status: "NOT_PDQC"
          });
          continue;
        }
        // Prevent same operator from verifying twice
        if (existingByHashRecord.operator.toString() === operatorId) {
          failedScans.push({
            serialNumber,
            reason: "Second verification must be by different operator",
            status: "SAME_OPERATOR"
          });
          continue;
        }
        // Accept only PASS or NG at second verification
        if (serialStatus === 'PASS' || serialStatus === 'NG') {
          await ScanLog.updateOne(
            { _id: existingByHashRecord._id },
            {
              $set: {
                verificationStage: 2,
                verifiedBy: operatorId,
                finalScanTime: malaysiaNow,
                secondSerialStatus: serialStatus,
                secondVerifierName: user.name
              }
            }
          ).session(session);

          if (serialStatus === 'NG') {
            netOutputDelta--;
          }
        } else {
          failedScans.push({
            serialNumber,
            reason: "Invalid status for second verification (must be PASS or NG)",
            status: "INVALID_SECOND_STATUS"
          });
        }
        continue;
      }

      // Already rejected at first stage
      if (existingByHashRecord && existingByHashRecord.verificationStage === 1 && existingByHashRecord.serialStatus === 'NG') {
        failedScans.push({
          serialNumber,
          reason: "Serial rejected at first verification",
          status: "REJECTED_STAGE1"
        });
        continue;
      }
      // Already fully finished
      if (existingByHashRecord && existingByHashRecord.verificationStage === 2) {
        failedScans.push({
          serialNumber,
          reason: "Already fully verified as finished goods",
          status: "FINISHED"
        });
        continue;
      }
    }

    // Update outputs/efficiency
    let nextTotalOutputs = line.totalOutputs + netOutputDelta;
    if (nextTotalOutputs < 0) nextTotalOutputs = 0;
    let nextRejectedOutputs = line.rejectedOutputs + totalRejected;

    const currentEfficiency = calculateCurrentEfficiency({
      ...line.toObject(),
      totalOutputs: nextTotalOutputs,
      startTime: line.startTime
    });

    const targetEfficiency = calculateTargetEfficiency({
      ...line.toObject(),
      totalOutputs: nextTotalOutputs
    });

    await Line.findByIdAndUpdate(
      lineId,
      {
        $set: { 
          totalOutputs: nextTotalOutputs,
          rejectedOutputs: nextRejectedOutputs,
          targetEfficiency: targetEfficiency
        },
        $push: {
          efficiencyHistory: {
            timestamp: malaysiaNow,
            efficiency: currentEfficiency,
            target: targetEfficiency,
            rejectedOutputs: nextRejectedOutputs,
          }
        }
      },
      { new: true, session }
    );

    // Save all new scan logs
    await Promise.all(scanResults.map(scanDoc => scanDoc.save({ session })));

    await session.commitTransaction(); session.endSession();

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      io.emit(isBatch ? 'newScanBatch' : 'newScan', { lineId });
    }

    return res.status(200).json({
      message: isBatch ?
        `Batch processed: ${totalPassed} PASS at first scan, ${totalRejected} NG at first scan, ${failedScans.length} failed` :
        (serialStatus === 'PASS' ? "Serial scanned successfully" : "Serial marked as NG"),
      ...(isBatch ? {
        passedCount: totalPassed,
        rejectedCount: totalRejected,
        failedScans: failedScans
      } : {
        scanId: scanResults[0]?._id,
      }),
      outputs: nextTotalOutputs,
      efficiency: currentEfficiency
    });

  } catch (error) {
    try { await session.abortTransaction(); } catch {}
    session.endSession();
    return res.status(500).json({ message: "Scan failed", error: error.message });
  }
};

const validateSerial = async (req, res) => {
  try {
    const { serialNumber } = req.body;

    if (!serialNumber || typeof serialNumber !== 'string' || serialNumber.trim() === '') {
      return res.status(400).json({ message: "Valid serial number is required." });
    }
    const serialHash = hashSerial(serialNumber.trim());

    const scan = await ScanLog.findOne({ 
      serialNumberHash: serialHash
    })
    .populate('operator', 'name')
    .populate('verifiedBy', 'name')
    .populate('productionLine', 'name')
    .sort({ scannedAt: -1 });

    if (!scan) {
      return res.status(404).json({ message: 'Serial number not found' });
    }

    let decryptedSerial = '';
    try {
      decryptedSerial = decryptSerial(scan.serialNumber);
    } catch {
      decryptedSerial = '[decryption error]';
    }

    const response = {
      message: '',
      lineName: scan.productionLine?.name || '',
      model: scan.model || '',
      serialNumber: decryptedSerial,
      firstStatus: scan.serialStatus,
      firstOperator: scan.operator?.name || scan.name || '-',
      firstScanTime: scan.scannedAt,
      verificationStage: scan.verificationStage,
      secondStatus: scan.verificationStage >= 2 
        ? (scan.secondSerialStatus || scan.serialStatus)
        : null,
      secondVerifier: scan.verifiedBy?.name || scan.secondVerifierName || '-',
      secondScanTime: scan.finalScanTime,
    };

    if (scan.verificationStage === 2) {
      response.message = 'Serial has been double-verified (finished goods).';
      response.status = scan.secondSerialStatus === 'NG' || scan.serialStatus === 'NG' ? 'NG' : 'PASS';
    } else if (scan.verificationStage === 1 && scan.serialStatus === 'PASS') {
      response.message = 'Serial has been scanned at first station, pending second verification.';
      response.status = 'PENDING_SECOND';
    } else if (scan.verificationStage === 1 && scan.serialStatus === 'NG') {
      response.message = 'Serial was rejected at first station.';
      response.status = 'NG';
    } else {
      response.message = 'Serial record found, status unknown.';
      response.status = 'UNKNOWN';
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error validating serial:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getLineFromSerial = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    if (!serialNumber || typeof serialNumber !== 'string') {
      return res.status(400).json({ message: 'Valid serial number is required' });
    }

    // Use hash for lookup, matching scanSerial's logic
    const serialHash = hashSerial(serialNumber.trim());

    // Find the latest scan with this serial, stage 1, and status PASS
    const scan = await ScanLog.findOne({
      serialNumberHash: serialHash,
      verificationStage: 1,
      serialStatus: 'PASS'
    }).sort({ scannedAt: -1 });

    if (!scan) {
      return res.status(404).json({ message: 'No valid scan record found for this serial' });
    }

    const line = await Line.findById(scan.productionLine);
    if (!line) {
      return res.status(404).json({ message: 'Line not found for this serial' });
    }

    return res.status(200).json({
      lineId: line._id,
      name: line.name,
      targetOutputs: line.targetOutputs,
      totalOutputs: line.totalOutputs,
      department: line.department,
    });
  } catch (error) {
    console.error('Error fetching line from serial:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get one line
const getLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    const line = await Line.findById(lineId);
    if (!line) return res.status(404).json({ message: 'Line not found' });
    return res.json(line);
  } catch (error) {
    console.error('Error fetching line:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get all lines (optimized)
const getAllLines = async (req, res) => {
  try {
    const lines = await Line.find().populate('operatorIds', 'name');

    const formatted = lines.map((l) => ({
      id: l._id.toString(),
      name: l.name,
      modelRuns: l.modelRuns || [],
      department: l.department,
      operatorName: l.operatorIds?.map(o => o.name).join(', ') || 'No operator',
      operatorIds: l.operatorIds?.map(o => o._id.toString()) || [],
      totalOutputs: l.totalOutputs,
      targetOutputs: l.targetOutputs,
      startTime: l.startTime,
      linestatus: l.linestatus,
      efficiencyHistory: l.efficiencyHistory,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching lines:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Efficiency info
const getLineEfficiency = async (req, res) => {
  try {
    const { lineId } = req.params;
    const line = await Line.findById(lineId);
    if (!line) return res.status(404).json({ message: 'Line not found' });
    if (!line.startTime) return res.status(400).json({ message: "Start time not set." });

    const efficiency = calculateCurrentEfficiency(line);
    const timeElapsed = ((Date.now() - line.startTime.getTime()) / (1000 * 60 * 60)).toFixed(2);

    return res.status(200).json({
      lineId: line._id,
      model: line.model,
      totalOutputs: line.totalOutputs,
      targetOutputs: line.targetOutputs,
      timeElapsedMinutes: timeElapsed,
      efficiencyPerMinute: efficiency.toFixed(2),
    });
  } catch (error) {
    console.error('Error calculating efficiency:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Updated startLine function
const startLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    const line = await Line.findById(lineId);
    if (!line) return res.status(404).json({ message: 'Line not found' });

    if (line.startTime) {
      return res.status(400).json({ message: 'Line already started' });
    }

    // Use Malaysia time
    const malaysiaNow = getMalaysiaTime();
    const formattedTime = formatMalaysiaTime(malaysiaNow);

    const targetEfficiency = calculateTargetEfficiency({
      ...line.toObject(),
      startTime: malaysiaNow
    });

    const updatedLine = await Line.findByIdAndUpdate(
      lineId,
      { 
        startTime: malaysiaNow,
        linestatus: 'RUNNING',
        targetEfficiency: targetEfficiency,
        $push: {
          efficiencyHistory: {
            timestamp: malaysiaNow,
            efficiency: 0,
            target: targetEfficiency
          }
        }
      },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('lineStarted', {
        startTime: malaysiaNow,
        linestatus: 'RUNNING',
        targetEfficiency: targetEfficiency
      });
    }

    console.log(`Line started at Malaysia time: ${formattedTime}`);
    
    return res.status(200).json({ 
      message: 'Line started successfully',
      startTime: malaysiaNow.toISOString(),
      malaysiaTime: formattedTime
    });
  } catch (error) {
    console.error('Error starting line:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateTargetRates = async (io) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = getMalaysiaTime();
    // Find all running lines with startTime set
    const activeLines = await Line.find({
      startTime: { $ne: null },
      linestatus: 'RUNNING'
    }).session(session);

    const bulkOps = [];
    const updates = [];

    for (const line of activeLines) {
      const newTarget = calculateTargetEfficiency({
        ...line.toObject(),
        startTime: line.startTime,
        targetOutputs: line.targetOutputs,
        totalOutputs: line.totalOutputs
      });

      // Always update, no threshold check
      bulkOps.push({
        updateOne: {
          filter: { _id: line._id },
          update: {
            $set: { targetEfficiency: newTarget },
            $push: {
              efficiencyHistory: {
                timestamp: now,
                efficiency: calculateCurrentEfficiency(line),
                target: newTarget,
                rejectedOutputs: line.rejectedOutputs
              }
            }
          }
        }
      });

      // Prepare update for socket.io
      updates.push({
        lineId: line._id,
        targetEfficiency: newTarget
      });
    }

    if (bulkOps.length > 0) {
      await Line.bulkWrite(bulkOps, { session });

      // Emit updates to clients
      if (io) {
        try {
          io.emit('targetUpdates', updates);
        } catch (socketError) {
          console.error('Socket emission error:', socketError);
        }
      }
    }

    await session.commitTransaction();
    console.log('Target rates updated:', bulkOps.length, 'lines');
  } catch (error) {
    console.error('Error updating target rates:', error);
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

// controllers/lineController.js
const getPendingSecondVerification = async (req, res) => {
  try {
    const { lineId } = req.params;

    const pending = await ScanLog.aggregate([
      {
        $match: {
          productionLine: new mongoose.Types.ObjectId(lineId),
          verificationStage: 1,
          serialStatus: 'PASS'
        }
      },
      { $sort: { scannedAt: -1 } },
      {
        $group: {
          _id: "$serialNumber",
          doc: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$doc" }
      },
      {
        $project: {
          serialNumber: 1,
          model: 1,
          name: 1,
          scannedAt: 1
        }
      }
    ]);

    // Decrypt serial numbers before returning
    const result = pending.map(doc => ({
      ...doc,
      serialNumber: (() => {
        try {
          return decryptSerial(doc.serialNumber);
        } catch {
          return '[decryption error]';
        }
      })(),
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching pending second verification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getModelsRun = async (req, res) => {
  const { lineId } = req.params;
  const line = await Line.findById(lineId);
  if (!line) return res.status(404).json({ message: 'Line not found' });
  res.json(line.modelRuns || []);
};

// Reset all lines at the end of the day
const resetLinesAtDayEnd = async (req, res) => {
  try {
    // Reset all lines as before
    await Line.updateMany({}, {
      $set: {
        totalOutputs: 0,
        targetOutputs: 0,
        rejectedOutputs: 0,
        linestatus: 'STOPPED',
        targetEfficiency: 0,
        startTime: null,
        efficiencyHistory: [],
        modelRuns: [],
      }
    });

    // Add a "stopped" point to each line's history
    const lines = await Line.find({});
    const malaysiaNow = getMalaysiaTime();
    for (const line of lines) {
      await Line.findByIdAndUpdate(line._id, {
        $push: {
          efficiencyHistory: {
            timestamp: malaysiaNow,
            efficiency: 0,
            target: 0,
            rejectedOutputs: 0,
            stopped: true
          }
        }
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('lineReset', {});
    }
    return res.status(200).json({ message: 'All lines have been reset for the new day.' });
  } catch (error) {
    console.error('Error resetting lines:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Delete line
const deleteLine = async (req, res) => {
  try {
    const { id } = req.params;
    if (!['engineer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const deletedLine = await Line.findByIdAndDelete(id);
    if (!deletedLine) {
      return res.status(404).json({ message: 'Line not found' });
    }

    return res.status(200).json({ message: 'Production line deleted successfully' });
  } catch (error) {
    console.error('Error deleting line:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createLine,
  updateLine,
  scanSerial,
  validateSerial,
  getLineFromSerial,
  getLine,
  getAllLines,
  getLineEfficiency,
  deleteLine,
  updateTargetRates,
  getModelsRun,
  getPendingSecondVerification,
  startLine,
  resetLinesAtDayEnd
};
