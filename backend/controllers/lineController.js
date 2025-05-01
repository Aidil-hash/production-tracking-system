// controllers/lineController.js

const { model } = require('mongoose');
const Line = require('../models/Line');
const ScanLog = require('../models/ScanRecord');
const User = require('../models/User');

// Create or initialize a new production line
const createLine = async (req, res) => {
  try {
    const { model, materialCount, linetargetOutputs, newdepartment } = req.body;
    if (!model || materialCount == null) {
      return res.status(400).json({ message: 'Model and materialCount are required' });
    }

    const newLine = new Line({
      model,
      currentMaterialCount: materialCount,
      targetOutputs: linetargetOutputs,
      department: newdepartment,
    });
    await newLine.save();

    return res.status(201).json({ message: 'Production line created', line: newLine });
  } catch (error) {
    console.error('Error creating line:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an existing line’s model or material count
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

// Operator scans a serial number
const scanSerial = async (req, res) => {
  try {
    console.log("Request received:", req.params, req.body, req.user);

    const { lineId } = req.params;
    const { serialNumber } = req.body;
    const operatorId = req.user.id;

    if (!serialNumber) {
      console.error("Serial number is missing");
      return res.status(400).json({ message: "Serial number is required." });
    }

    const line = await Line.findById(lineId);
    if (!line) {
      console.error("Production line not found:", lineId);
      return res.status(404).json({ message: "Production line not found." });
    }

    const operatorName = await User.findById(operatorId);
    //console.log("Operator found:", operatorName);

    if (!line.operatorId || line.operatorId.toString() !== operatorId) {
      console.error("Operator not assigned to this line:", operatorId);
      return res.status(403).json({ message: "You are not assigned to this production line." });
    }

    line.totalOutputs = (line.totalOutputs || 0) + 1;
    line.currentMaterialCount = Math.max((line.currentMaterialCount || 0) - 1, 0);

    if (!line.startTime) line.startTime = new Date();

    const currentTime = new Date();
    const timeElapsedMs = currentTime - line.startTime;
    const timeElapsedMinutes = Math.max(timeElapsedMs / (1000 * 60), 1);

    const efficiency = line.totalOutputs / timeElapsedMinutes;

    // CRITICAL: Ensure array exists and push data correctly
    if (!Array.isArray(line.efficiencyHistory)) {
      line.efficiencyHistory = [];
    }

    line.efficiencyHistory.push({
      timestamp: currentTime,
      efficiency: parseFloat(efficiency.toFixed(2)),
    });

    await line.save();
    //console.log("Line updated:", line);

    const newScanLog = new ScanLog({
      productionLine: line._id,
      model: line.model,
      operator: operatorId,
      name: operatorName ? operatorName.name : 'Unknown',
      serialNumber,
    });

    await newScanLog.save();
    //console.log("Scan log created:", newScanLog);

    const io = req.app.get('io');
    if (io) {
      io.emit('newScan', {
        productionLine: line._id,
        model: line.model,
        operator: operatorId,
        name: operatorName ? operatorName.name : 'Unknown',
        serialNumber,
        scannedAt: newScanLog.scannedAt,
      });

      // Backend: Emitting the updated line data with lineId
      io.emit('lineOutputUpdated', {
        _id: line._id,
        efficiencyData: line.efficiencyHistory,  // Send only the relevant data
      });
    } else {
      console.error("Socket.IO instance not found");
    }

    return res.status(200).json({
      message: "Serial scanned and recorded successfully.",
      line,
      scan: newScanLog,
    });

  } catch (error) {
    console.error("Error scanning serial:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get info about a specific line
const getLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    // For MongoDB, something like:
    const line = await Line.findById(lineId);
    if (!line) {
      return res.status(404).json({ message: 'Line not found' });
    }
    return res.json(line);
  } catch (error) {
    console.error('Error fetching line:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get all lines
const getAllLines = async (req, res) => {
  try {
    const lines = await Line.find();

    const formattedLines = await Promise.all(
      lines.map(async (l) => {
        // Lookup leader if leaderId is set
        let leaderDoc = null;
        if (l.leaderId) {
          leaderDoc = await User.findById(l.leaderId);
        }

        // Lookup operator if operatorId is set
        let operatorDoc = null;
        if (l.operatorId) {
          operatorDoc = await User.findById(l.operatorId);
        }

        return {
          id: l._id.toString(),
          model: l.model,
          leaderId: l.leaderId,
          leaderName: leaderDoc ? leaderDoc.name : 'No leader',
          operatorId: l.operatorId,
          operatorName: operatorDoc ? operatorDoc.name : 'No operator',
          currentMaterialCount: l.currentMaterialCount,
          totalOutputs: l.totalOutputs,
          targetOutputs: l.targetOutputs,
          startTime: l.startTime,
        };
      })
    );

    return res.status(200).json(formattedLines);
  } catch (error) {
    console.error('Error fetching lines:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Calculate efficiency
const getLineEfficiency = async (req, res) => {
  try {
    const { lineId } = req.params;
    const line = await Line.findById(lineId);
    if (!line) {
      return res.status(404).json({ message: 'Line not found' });
    }

    const currentTime = Date.now();
    const timeElapsedMs = currentTime - line.startTime.getTime();
    const timeElapsedMinutes = timeElapsedMs / (1000 * 60);

    let efficiency = 0;
    if (timeElapsedMinutes > 0) {
      efficiency = line.totalOutputs / timeElapsedMinutes;
    }

    return res.status(200).json({
      lineId: line._id,
      model: line.model,
      totalOutputs: line.totalOutputs,
      targetOutputs: line.targetOutputs,
      timeElapsedMinutes: timeElapsedMinutes.toFixed(2),
      efficiencyPerMinute: efficiency.toFixed(2)
    });
  } catch (error) {
    console.error('Error calculating efficiency:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Predict material low
const predictMaterialLow = async (req, res) => {
  try {
    const { lineId } = req.params;
    const line = await Line.findById(lineId);
    if (!line) {
      return res.status(404).json({ message: 'Line not found' });
    }

    const thresholdMinutes = 30;
    const currentTime = Date.now();
    const timeElapsedMs = currentTime - line.startTime.getTime();
    const timeElapsedMinutes = timeElapsedMs / (1000 * 60);

    let efficiency = 0;
    if (timeElapsedMinutes > 0) {
      efficiency = line.totalOutputs / timeElapsedMinutes;
    }

    const predictedTime = efficiency ? line.currentMaterialCount / efficiency : 0;
    let notificationSent = predictedTime < thresholdMinutes;

    const recentEfficiencyData = line.efficiencyHistory.slice(-30); // last 30 records

    return res.status(200).json({
      lineId: line._id,
      model: line.model,
      currentMaterialCount: line.currentMaterialCount,
      totalOutputs: line.totalOutputs,
      targetOutputs: line.targetOutputs,
      predictedTimeToDepletion: predictedTime.toFixed(2),
      notificationSent,
      efficiencyData: recentEfficiencyData
    });

  } catch (error) {
    console.error('Error predicting material low:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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
  predictMaterialLow,
  deleteLine
};
