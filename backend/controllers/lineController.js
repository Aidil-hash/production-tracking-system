const mongoose = require('mongoose');
const Line = require('../models/Line');
const ScanLog = require('../models/ScanRecord');
const User = require('../models/User');
const { getMalaysiaTime, formatMalaysiaTime } = require('../utils/timeHelper');

// Utility function
const calculateCurrentEfficiency = (line) => {
  if (!line.startTime) return 0;
  const now = getMalaysiaTime();
  const start = line.startTime;
  
  // Get precise minutes with 2 decimal places
  const elapsedMinutes = Math.max(((now - start) / 60000), 0.01); // Prevent division by zero
  const efficiency = (line.totalOutputs || 0) / elapsedMinutes;

  console.log(`Efficiency Debug: 
    Outputs: ${line.totalOutputs || 0}
    Start: ${start.toISOString()}
    Now: ${now.toISOString()}
    Elapsed: ${elapsedMinutes.toFixed(2)} mins
    Efficiency: ${efficiency.toFixed(2)}/min`);

  return Number(efficiency.toFixed(2)); // outputs per minute
};

const calculateTargetEfficiency = (line, _shiftStartHour = 8, _shiftStartMinute = 15, shiftEndHour = 19, shiftEndMinute = 45) => {
  const now = getMalaysiaTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Debug: Log current time and shift end time
  console.log("----- DEBUG LOGS -----");
  console.log("Current Time:", now.toISOString());
  console.log("Line Data:", {
    startTime: line.startTime,
    targetOutputs: line.targetOutputs,
    totalOutputs: line.totalOutputs || 0
  });

  // Define shift end time
  const shiftEnd = new Date(today);
  shiftEnd.setHours(shiftEndHour, shiftEndMinute, 0, 0);
  console.log("Shift End Time:", shiftEnd.toISOString());

  // If current time is past shift end, return 0
  if (now >= shiftEnd) {
    console.log("Current time is past shift end. Returning 0.");
    return 0;
  }

  // If line hasn't started, return 0
  if (!line.startTime) {
    console.log("Line has no startTime. Returning 0.");
    return 0;
  }

  const lineStartTime = new Date(line.startTime);
  console.log("Line Start Time (Parsed):", lineStartTime.toISOString());

  // If line started after shift end, return 0
  if (lineStartTime >= shiftEnd) {
    console.log("Line started after shift end. Returning 0.");
    return 0;
  }

  // Calculate remaining outputs and time
  const remainingOutputs = Math.max(line.targetOutputs - (line.totalOutputs || 0), 0);
  const remainingMinutes = Math.max((shiftEnd - now) / (60 * 1000), 1);
  console.log("Remaining Outputs:", remainingOutputs);
  console.log("Remaining Minutes:", remainingMinutes);

  // Calculate required rate
  const requiredRate = Number((remainingOutputs / remainingMinutes).toFixed(4));
  console.log("Required Rate (outputs/min):", requiredRate);

  // Calculate baseline rate (total available time from line start to shift end)
  const totalAvailableMinutes = (shiftEnd - lineStartTime) / (60 * 1000);
  const baselineRate = Number((line.targetOutputs / totalAvailableMinutes).toFixed(4));
  console.log("Total Available Minutes (from line start):", totalAvailableMinutes);
  console.log("Baseline Rate (outputs/min):", baselineRate);

  // Final comparison
  const finalRate = remainingOutputs <= 0 ? 0 : Math.max(baselineRate, requiredRate);
  console.log("Final Target Efficiency:", finalRate);
  console.log("----- END DEBUG LOGS -----\n");

  return finalRate;
};

// Create a production line
const createLine = async (req, res) => {
  try {
    const { model, targetOutputs, department, operatorId } = req.body;
    if (!model || department == null) {
      return res.status(400).json({ message: 'Model and department are required' });
    }

    const targetEff = calculateTargetEfficiency({
      targetOutputs: targetOutputs,
      startTime: null,  // Add this
      totalOutputs: 0   // Add this
    });

    const newLine = new Line({
      model,
      targetOutputs,
      department,
      targetEfficiency: targetEff,
      operatorId,
      linestatus: 'STOPPED'
    });
    await newLine.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('newLine', {
        model: newLine.model,
        operator: operatorId,
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
    const { serialNumber, serialStatus } = req.body; // Add serialStatus here
    const operatorId = req.user.id;

    if (!serialNumber || typeof serialNumber !== 'string' || serialNumber.trim() === '') {
      return res.status(400).json({ message: "Valid serial number is required." });
    }

    const line = await Line.findById(lineId)
      .populate('operatorId', 'name')
      .session(session);

    if (!line) return res.status(404).json({ message: "Production line not found." });

    if (!line.operatorId || line.operatorId._id.toString() !== operatorId) {
      return res.status(403).json({ message: "Not authorized for this production line." });
    }

    if (line.totalOutputs >= line.targetOutputs) {
      return res.status(409).json({ message: "Target reached." });
    }

    const existingScan = await ScanLog.findOne({ serialNumber }).session(session);
    
    if (existingScan) {
      // If previous scan was PASS, reject any new scan
      if (existingScan.serialStatus === 'PASS') {
        return res.status(409).json({ 
          message: "Serial number already passed inspection and cannot be scanned again." 
        });
      }
      
      // If previous scan was NG and new scan is not PASS, reject
      if (existingScan.serialStatus === 'NG' && serialStatus !== 'PASS') {
        return res.status(409).json({ 
          message: "This NG serial number can only be rescanned as PASS." 
        });
      }
    }

    // Use Malaysia time for the scan
    const malaysiaNow = getMalaysiaTime();
    const formattedTime = formatMalaysiaTime(malaysiaNow);

    const nextTotalOutputs = serialStatus === 'PASS' ? line.totalOutputs + 1 : line.totalOutputs;

    const rejectedOutputs = serialStatus === 'NG' ? line.rejectedOutputs + 1 : line.rejectedOutputs;

    // Calculate efficiencies with local time
    const currentEfficiency = calculateCurrentEfficiency({
      ...line.toObject(),
      totalOutputs: nextTotalOutputs,
      startTime: line.startTime // Already in local time from startLine
    });

    const targetEfficiency = calculateTargetEfficiency({
      ...line.toObject(),
      totalOutputs: nextTotalOutputs
    });

    // Update the line with local time
    const updatedLine = await Line.findByIdAndUpdate(
      lineId,
      {
        $set: { 
          totalOutputs: nextTotalOutputs,
          rejectedOutputs: rejectedOutputs,
          targetEfficiency: targetEfficiency
        },
        $push: {
          efficiencyHistory: {
            timestamp: malaysiaNow,
            efficiency: currentEfficiency,
            target: targetEfficiency,
            rejectedOutputs: rejectedOutputs,
          }
        }
      },
      { new: true, session }
    );

    const newScanLog = new ScanLog({
      productionLine: lineId,
      model: updatedLine.model,
      operator: operatorId,
      name: line.operatorId.name,
      serialNumber,
      serialStatus: serialStatus, // Add this field
      efficiency: currentEfficiency,
      scanTime: malaysiaNow,
      localScanTime: formattedTime,
    });

    await newScanLog.save({ session });
    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      io.emit('newScan', {
        productionLine: lineId,
        model: updatedLine.model,
        operator: operatorId,
        name: line.operatorId.name,
        department: updatedLine.department,
        totalOutputs: updatedLine.totalOutputs,
        targetOutputs: updatedLine.targetOutputs,
        rejectedOutputs: updatedLine.rejectedOutputs,
        efficiency: currentEfficiency,
        efficiencyHistory: updatedLine.efficiencyHistory,
        serialNumber,
        Status: serialStatus,
        scannedAt: malaysiaNow,
        localTime: formattedTime,
      });
    }

    return res.status(200).json({
      message: serialStatus === 'PASS' ? 
        "Serial scanned successfully as PASS" : 
        "Serial marked as NG",
      scanId: newScanLog._id,
      outputs: updatedLine.totalOutputs,
      efficiency: currentEfficiency,
      localTime: formattedTime,
    });
  } catch (error) {
    console.error("Scan error:", error);
    await session.abortTransaction();
    return res.status(500).json({ message: "Server error", error: error.message });
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

    // Check if serial exists in ScanLog with PASS status
    const existingScan = await ScanLog.findOne({ 
      serialNumber,
      serialStatus: 'PASS' 
    });
    
    if (existingScan) {
      return res.status(200).json({ 
        message: "Serial number has PASSED first station",
        passedFirstStation: true,
        Status: existingScan.serialStatus,
        scanRecord: {
          model: existingScan.model,
          scanTime: existingScan.scanTime,
          operator: existingScan.name,
          productionLine: existingScan.productionLine
        }
      });
    }

    // Check if serial exists but with FAIL status
    const failedScan = await ScanLog.findOne({ 
      serialNumber,
      serialStatus: 'NG' 
    });

    if (failedScan) {
      return res.status(200).json({ 
        message: "Serial number was REJECTED at first station",
        passedFirstStation: false,
        Status: failedScan.serialStatus,
        scanRecord: {
          model: failedScan.model,
          scanTime: failedScan.scanTime,
          operator: failedScan.name,
          productionLine: failedScan.productionLine
        }
      });
    }

    // If no record found
    return res.status(200).json({ 
      message: "Serial number has not been processed at first station",
      passedFirstStation: false
    });

  } catch (error) {
    console.error("Error validating serial:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
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
    const lines = await Line.find().populate('operatorId', 'name');

    const formatted = lines.map((l) => ({
      id: l._id.toString(),
      model: l.model,
      department: l.department,
      operatorName: l.operatorId?.name || 'No operator',
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

    for (const line of activeLines) {
      const newTarget = calculateTargetEfficiency(
        {
          ...line.toObject(),
          startTime: line.startTime,
          targetOutputs: line.targetOutputs,
          totalOutputs: line.totalOutputs
        }
      );

      // Only update if the target has changed significantly (> 0.01 difference)
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
      }
    }

    if (bulkOps.length > 0) {
      await Line.bulkWrite(bulkOps, { session });

      const io = req.app.get('io');
      if (io) {
        const updates = bulkOps.map(op => ({
          lineId: op.updateOne.filter._id,
          targetEfficiency: op.updateOne.update.$set.targetEfficiency
        }));
        io.emit('targetUpdates', updates);
      }
    }

    await session.commitTransaction();
    console.log('Target rates updated:', bulkOps.length, 'lines');
  } catch (error) {
    console.error('Error updating target rates:', error);
    await session.abortTransaction();
    // Consider adding retry logic here for transient errors
  } finally {
    session.endSession();
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
  getLine,
  getAllLines,
  getLineEfficiency,
  deleteLine,
  updateTargetRates,
  startLine,
};
