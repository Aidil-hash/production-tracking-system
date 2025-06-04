const mongoose = require('mongoose');
const Line = require('../models/Line');
const ScanLog = require('../models/ScanRecord');
const Output = require('../models/Output'); // Add at top if not present
const User = require('../models/User');
const ModelCode = require('../models/ModelCode'); // <-- Make sure this is required at the top!
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

// Updated scanSerial function
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
    const formattedTime = formatMalaysiaTime(malaysiaNow);

    if (!isBatch && (!serialNumber || typeof serialNumber !== 'string' || serialNumber.trim() === '')) {
      return res.status(400).json({ message: "Valid serial number is required." });
    }

    const line = await Line.findById(lineId).session(session);
    if (!line) return res.status(404).json({ message: "Production line not found." });

    // Fetch the user for role-based authorization
    const user = await User.findById(operatorId);
    if (!user) return res.status(401).json({ message: "User not found" });

    // Find existing scan logs for these serials
    const existingScans = await ScanLog.find({
      serialNumber: { $in: scansToProcess.map(s => s.serialNumber) }
    }).session(session);

    const existingSerialMap = new Map();
    existingScans.forEach(scan => {
      existingSerialMap.set(scan.serialNumber, scan);
    });

    let totalPassed = 0;
    let totalRejected = 0;
    const scanResults = [];
    const failedScans = [];

    for (const { serialNumber, serialStatus } of scansToProcess) {
      if (!serialNumber || typeof serialNumber !== 'string' || serialNumber.trim() === '') {
        failedScans.push({
          serialNumber: serialNumber || 'N/A',
          reason: "Invalid serial number format",
          status: "INVALID"
        });
        continue;
      }

      // Model detection (first 6 chars)
      let detectedModel = undefined;
      let code = undefined;
      if (serialNumber && serialNumber.length >= 6) {
        code = serialNumber.slice(0, 6);
        const modelCodeDoc = await ModelCode.findOne({ code });
        if (modelCodeDoc) detectedModel = modelCodeDoc.modelName;
      }

      // Track modelRuns on the line (no duplicates)
      if (detectedModel && code) {
        await Line.updateOne(
          { _id: line._id, "modelRuns.code": code },
          { $set: { "modelRuns.$.lastSeen": malaysiaNow } }
        ).session(session);
        // Only push if not already present
        const updatedLine = await Line.findById(line._id, null, { session });
        const existsAfter = (updatedLine.modelRuns || []).some(run => run.code === code);
        if (!existsAfter) {
          await Line.updateOne(
            { _id: line._id },
            { $push: { modelRuns: { code, modelName: detectedModel, firstSeen: malaysiaNow, lastSeen: malaysiaNow } } }
          ).session(session);
        }
      }

      const existingScan = existingSerialMap.get(serialNumber);

      // AUTHORIZATION CHECKS for each stage
      if (!existingScan) {
        // FIRST STATION (stage 1): Only assigned operator can scan
        if (!line.operatorIds.map(String).includes(operatorId) || user.role !== 'operator') {
          failedScans.push({
            serialNumber,
            reason: "Only assigned line operators can perform first scan.",
            status: "NOT_OPERATOR"
          });
          continue;
        }
        // FIRST SCAN LOGIC
        if (serialStatus === 'PASS' || serialStatus === 'NG') {
          scanResults.push(new ScanLog({
            productionLine: lineId,
            model: detectedModel,
            operator: operatorId,
            name: user.name,
            serialNumber,
            serialStatus,
            scannedAt: malaysiaNow,
            verificationStage: 1,
            verifiedBy: null,
            finalScanTime: null,
          }));
          if (serialStatus === 'NG') totalRejected++;
        } else {
          failedScans.push({
            serialNumber,
            reason: "Invalid status (must be PASS or NG)",
            status: "INVALID_STATUS"
          });
        }
        continue;
      }

      // SECOND STATION (stage 2): Only PDQC operator can scan
      if (existingScan.verificationStage === 1 && existingScan.serialStatus === 'PASS') {
        if (user.role !== 'PDQC operator' && user.role !== 'pdqc') {
          failedScans.push({
            serialNumber,
            reason: "Only PDQC operators can perform second station verification.",
            status: "NOT_PDQC"
          });
          continue;
        }
        if (existingScan.operator.toString() === operatorId) {
          failedScans.push({
            serialNumber,
            reason: "Second verification must be by different operator",
            status: "SAME_OPERATOR"
          });
          continue;
        }
        if (serialStatus === 'PASS') {
          await ScanLog.updateOne(
            { _id: existingScan._id },
            {
              $set: {
                verificationStage: 2,
                verifiedBy: operatorId,
                finalScanTime: malaysiaNow,
                secondSerialStatus: 'PASS',
                secondVerifierName: user.name,
              }
            }
          ).session(session);
          totalPassed++;
          await Output.create([{
            lineId,
            timestamp: malaysiaNow,
            count: 1,
          }], { session });
          continue;
        } else if (serialStatus === 'NG') {
          await ScanLog.updateOne(
            { _id: existingScan._id },
            {
              $set: {
                verificationStage: 2,
                verifiedBy: operatorId,
                finalScanTime: malaysiaNow,
                secondSerialStatus: 'NG',
                secondVerifierName: user.name,
              }
            }
          ).session(session);
          totalRejected++;
          continue;
        } else {
          failedScans.push({
            serialNumber,
            reason: "Invalid status for second verification (must be PASS or NG)",
            status: "INVALID_SECOND_STATUS"
          });
          continue;
        }
      }

      // Already rejected at first stage
      if (existingScan.verificationStage === 1 && existingScan.serialStatus === 'NG') {
        failedScans.push({
          serialNumber,
          reason: "Serial rejected at first verification",
          status: "REJECTED_STAGE1"
        });
        continue;
      }
      // Already fully finished
      if (existingScan.verificationStage === 2) {
        failedScans.push({
          serialNumber,
          reason: "Already fully verified as finished goods",
          status: "FINISHED"
        });
        continue;
      }
    }

    // Update totals and efficiency (totalOutputs = finished goods)
    const nextTotalOutputs = line.totalOutputs + totalPassed;
    const nextRejectedOutputs = line.rejectedOutputs + totalRejected;

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

    await Promise.all(scanResults.map(scan => scan.save({ session })));
    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      const eventName = isBatch ? 'newScanBatch' : 'newScan';
      io.emit(eventName, { lineId });
    }

    return res.status(200).json({
      message: isBatch ?
        `Batch processed: ${totalPassed} fully verified as finished goods, ${totalRejected} rejected, ${failedScans.length} failed` :
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
    console.error(error);
    await session.abortTransaction();
    return res.status(500).json({
      message: "Scan failed",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

const validateSerial = async (req, res) => {
  try {
    const { serialNumber } = req.body;

    if (!serialNumber || typeof serialNumber !== 'string' || serialNumber.trim() === '') {
      return res.status(400).json({ message: "Valid serial number is required." });
    }

    // Find the latest scan for this serial, on this line (optional: if your flow is per-line)
    const scan = await ScanLog.findOne({ 
      serialNumber,
    })
    .populate('operator', 'name')
    .populate('verifiedBy', 'name')
    .populate('productionLine', 'name')
    .sort({ scannedAt: -1 });

    if (!scan) {
      return res.status(404).json({ message: 'Serial number not found' });
    }

    // Compose the response object
    const response = {
      message: '',
      lineName: scan.productionLine?.name || '',
      model: scan.model || '',
      firstStatus: scan.serialStatus,
      firstOperator: scan.operator?.name || scan.name || '-',
      firstScanTime: scan.scannedAt,
      verificationStage: scan.verificationStage,
      secondStatus: scan.verificationStage >= 2 
        ? (scan.secondSerialStatus || scan.serialStatus) // Fallback to serialStatus if you only use one status
        : null,
      secondVerifier: scan.verifiedBy?.name || scan.secondVerifierName || '-',
      secondScanTime: scan.finalScanTime,
    };

    // Set a summary message and status
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

    const scan = await ScanLog.findOne({ serialNumber, verificationStage: 1, serialStatus: 'PASS' });

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
    const activeLines = await Line.find({ 
      startTime: { $ne: null },
      linestatus: 'RUNNING'
    }).session(session);

    const bulkOps = [];
    const updates = []; // Store updates for socket emission

    for (const line of activeLines) {
      const newTarget = calculateTargetEfficiency({
        ...line.toObject(),
        startTime: line.startTime,
        targetOutputs: line.targetOutputs,
        totalOutputs: line.totalOutputs
      });

      if (Math.abs(newTarget - (line.targetEfficiency || 0)) > 0.001) {
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
        
        // Prepare update for socket
        updates.push({
          lineId: line._id,
          targetEfficiency: newTarget
        });
      }
    }

    if (bulkOps.length > 0) {
      await Line.bulkWrite(bulkOps, { session });

      // Use the io parameter passed to the function
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
    // Consider adding retry logic here for transient errors
    throw error; // Re-throw if you want calling code to handle it
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

    res.status(200).json(pending);
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
};
