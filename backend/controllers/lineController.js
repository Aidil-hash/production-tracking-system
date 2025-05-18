const mongoose = require('mongoose');
const Line = require('../models/Line');
const ScanLog = require('../models/ScanRecord');
const User = require('../models/User');

// Utility function
const calculateCurrentEfficiency = (line) => {
  const start = line.startTime || new Date();
  const elapsedHours = Math.max((new Date() - start) / (1000 * 60), 1);
  return line.totalOutputs / elapsedHours;
};

const calculateTargetEfficiency = (line) => {
  // Get today's 7:45 PM
  const today = new Date();
  const shiftEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    19, // 7 PM in 24-hour format
    45  // 45 minutes
  );

  // For new lines or lines that haven't started
  if (!line.startTime) {
    const shiftStart = new Date();
    shiftStart.setHours(9, 30, 0, 0); // Set to 9:30 AM
    const totalMinutes = Math.max((shiftEnd.getTime() - shiftStart.getTime()) / (60 * 1000), 1);
    // Round to 2 decimal places for consistency
    return Number((line.targetOutputs / totalMinutes).toFixed(2));
  }

  const now = Date.now();
  
  // If current time is past 7:45 PM, return 0
  if (now >= shiftEnd.getTime()) {
    return 0;
  }

  // For running lines, calculate based on remaining time and outputs
  const remainingOutputs = Math.max(line.targetOutputs - line.totalOutputs, 0);
  const remainingMs = shiftEnd.getTime() - now;
  const remainingMinutes = Math.max(remainingMs / (60 * 1000), 1);

  // Calculate required rate with consistent precision
  const requiredRate = Number((remainingOutputs / remainingMinutes).toFixed(2));

  // Calculate original target rate based on total shift duration
  const shiftStart = new Date(line.startTime);
  shiftStart.setHours(9, 30, 0, 0);
  const totalShiftMinutes = Math.max((shiftEnd.getTime() - shiftStart.getTime()) / (60 * 1000), 1);
  const originalRate = Number((line.targetOutputs / totalShiftMinutes).toFixed(2));

  // Return the maximum of required rate and original rate, with consistent precision
  return Math.max(requiredRate, originalRate);
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

// Serial scanning handler
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

    if (line.totalOutputs == line.targetOutputs) {
      return res.status(409).json({ message: "Target reached." });
    }

    const existingScan = await ScanLog.findOne({ serialNumber }).session(session);
    if (existingScan) {
      return res.status(409).json({ message: "Serial number already scanned." });
    }

    const nextTotalOutputs = line.totalOutputs + 1;

    const projectedEfficiency = calculateCurrentEfficiency({
      ...line.toObject(),
      totalOutputs: nextTotalOutputs
    });

    const newTarget = calculateTargetEfficiency({
      ...line.toObject(),
      totalOutputs: nextTotalOutputs
    });

    const updatedLine = await Line.findByIdAndUpdate(
      lineId,
      {
        $set: { 
          totalOutputs: nextTotalOutputs, // Use $set instead of $inc
          startTime: line.startTime || new Date(),
          targetEfficiency: newTarget
        },
        $push: {
          efficiencyHistory: {
            timestamp: new Date(),
            efficiency: projectedEfficiency,
            target: newTarget
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
      efficiency: projectedEfficiency,
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
        efficiency: projectedEfficiency,
        efficiencyHistory: updatedLine.efficiencyHistory,
        serialNumber,
        scannedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      message: "Serial scanned successfully",
      scanId: newScanLog._id,
      outputs: updatedLine.totalOutputs,
      efficiency: projectedEfficiency,
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

const startLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    const line = await Line.findById(lineId);
    if (!line) return res.status(404).json({ message: 'Line not found' });

    if (line.startTime) {
      return res.status(400).json({ message: 'Line already started' });
    }

    // Update the line with start time and status
    const updatedLine = await Line.findByIdAndUpdate(
      lineId,
      { 
        startTime: Date.now(), 
        linestatus: 'RUNNING',
        efficiencyHistory: [{
          timestamp: Date.now(),
          efficiency: 0,
          target: calculateTargetEfficiency({ // Add missing parameters
            ...line.toObject(),
            startTime: Date.now(),
            totalOutputs: line.totalOutputs
          })
        }]
      },
      { new: true }
    ).populate('operatorId', 'name');

    if (!updatedLine) {
      return res.status(404).json({ message: 'Line update failed' });
    }

    // Emit socket event if socket.io is configured
    const io = req.app.get('io');
    if (io) {
      io.emit('lineStarted', {
        lineId: updatedLine._id,
        status: updatedLine.linestatus,
        startTime: updatedLine.startTime
      });
    }

    return res.status(200).json({ 
      message: 'Line started successfully', 
      line: updatedLine 
    });
  } catch (error) {
    console.error('Error starting line:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateTargetRates = async (io) => {
  try {
    const activeLines = await Line.find({ 
      startTime: { $ne: null },
      linestatus: 'RUNNING'
    });

    for (const line of activeLines) {
      const newTarget = calculateTargetEfficiency({
        ...line.toObject(),
        startTime: line.startTime,
        targetOutputs: line.targetOutputs,
        totalOutputs: line.totalOutputs
      });
      
      await Line.findByIdAndUpdate(line._id, {
        $set: { targetEfficiency: newTarget },
        $push: {
          efficiencyHistory: {
            timestamp: new Date(),
            efficiency: calculateCurrentEfficiency(line),
            target: newTarget
          }
        }
      });

      if (io) {
        io.emit('targetUpdate', {
          lineId: line._id,
          targetEfficiency: newTarget
        });
      }
    }
  } catch (error) {
    console.error('Error updating target rates:', error);
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
