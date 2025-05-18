const mongoose = require('mongoose');
const Line = require('../models/Line');
const ScanLog = require('../models/ScanRecord');
const User = require('../models/User');

// Utility function
const calculateCurrentEfficiency = (line) => {
  if (!line.startTime) return 0;
  const elapsedMinutes = Math.max((new Date() - new Date(line.startTime)) / (60 * 1000), 1);
  return (line.totalOutputs || 0) / elapsedMinutes; // outputs per minute
};

const calculateTargetEfficiency = (line, _shiftStartHour = 8, _shiftStartMinute = 15, shiftEndHour = 19, shiftEndMinute = 45) => {
  const now = new Date();
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
  const requiredRate = Number((remainingOutputs / remainingMinutes).toFixed(2));
  console.log("Required Rate (outputs/min):", requiredRate);

  // Calculate baseline rate (total available time from line start to shift end)
  const totalAvailableMinutes = (shiftEnd - lineStartTime) / (60 * 1000);
  const baselineRate = Number((line.targetOutputs / totalAvailableMinutes).toFixed(2));
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
    const { serialNumber } = req.body;
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
      return res.status(409).json({ message: "Serial number already scanned." });
    }

    const nextTotalOutputs = line.totalOutputs + 1;
    const scanTime = new Date();
    const localScanTime = new Date(scanTime.getTime() - scanTime.getTimezoneOffset() * 60000);

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
          targetEfficiency: targetEfficiency
        },
        $push: {
          efficiencyHistory: {
            timestamp: localScanTime,
            efficiency: currentEfficiency,
            target: targetEfficiency
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
      efficiency: currentEfficiency,
      scanTime: localScanTime, // Store local time
      localScanTime: localScanTime.toString() // Human-readable format
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
        efficiency: currentEfficiency,
        efficiencyHistory: updatedLine.efficiencyHistory,
        serialNumber,
        scannedAt: localScanTime.toISOString(),
        localTime: localScanTime.toString()
      });
    }

    return res.status(200).json({
      message: "Serial scanned successfully",
      scanId: newScanLog._id,
      outputs: updatedLine.totalOutputs,
      efficiency: currentEfficiency,
      localTime: localScanTime.toString()
    });
  } catch (error) {
    console.error("Scan error:", error);
    await session.abortTransaction();
    return res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
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

    // Get current local time (adjusted for timezone)
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    
    // Calculate target efficiency with local time
    const targetEfficiency = calculateTargetEfficiency({
      ...line.toObject(),
      startTime: localNow
    });

    const updatedLine = await Line.findByIdAndUpdate(
      lineId,
      { 
        startTime: localNow, 
        linestatus: 'RUNNING',
        targetEfficiency: targetEfficiency,
        $push: {
          efficiencyHistory: {
            timestamp: localNow,
            efficiency: 0,
            target: targetEfficiency
          }
        }
      },
      { new: true }
    ).populate('operatorId', 'name');

    if (!updatedLine) {
      return res.status(404).json({ message: 'Line update failed' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('lineStarted', {
        lineId: updatedLine._id,
        status: updatedLine.linestatus,
        startTime: localNow.toISOString() // Send ISO string for consistency
      });
    }

    return res.status(200).json({ 
      message: 'Line started successfully', 
      line: updatedLine,
      localStartTime: localNow.toString() // Include human-readable local time
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
    const now = new Date();
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
      if (Math.abs(newTarget - (line.targetEfficiency || 0)) > 0.01) {
        bulkOps.push({
          updateOne: {
            filter: { _id: line._id },
            update: {
              $set: { targetEfficiency: newTarget },
              $push: {
                efficiencyHistory: {
                  timestamp: now,
                  efficiency: calculateCurrentEfficiency(line),
                  target: newTarget
                }
              }
            }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await Line.bulkWrite(bulkOps, { session });
      
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
  getLine,
  getAllLines,
  getLineEfficiency,
  deleteLine,
  updateTargetRates,
  startLine,
};
