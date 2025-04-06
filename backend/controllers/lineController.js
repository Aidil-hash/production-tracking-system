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
    const { lineId } = req.params;
    const { serialNumber } = req.body;
    const operatorId = req.user.id; // assume authentication middleware sets req.user

    if (!serialNumber) {
      return res.status(400).json({ message: "Serial number is required." });
    }

    // Use "Line" (not ProductionLine) since that's what you imported
    const line = await Line.findById(lineId);
    if (!line) {
      return res.status(404).json({ message: "Production line not found." });
    }

    // Optional: Check that the operator is assigned to this line
    if (!line.operatorId || line.operatorId.toString() !== operatorId) {
      return res.status(403).json({ message: "You are not assigned to this production line." });
    }

    // Update production line metrics: increment total outputs and decrement current material count if possible
    line.totalOutputs = (line.totalOutputs || 0) + 1;
    if (line.currentMaterialCount > 0) {
      line.currentMaterialCount -= 1;
    }
    await line.save();

    // Create a new scan log record
    const newScanLog = new ScanLog({
      productionLine: line._id,
      model: line.model,
      operator: operatorId,
      name: req.user.name,
      serialNumber
    });
    await newScanLog.save();

    // Emit a socket event to update scan logs in real-time
    const io = req.app.get('io');
    io.emit('newScan', {
      productionLine: line._id,
      model: line.model,
      operator: operatorId, // You might also populate operator name if needed
      name: req.user.name,
      serialNumber,
      scannedAt: newScanLog.scannedAt
    });

    return res.status(200).json({
      message: "Serial scanned and recorded successfully.",
      line,
      scan: newScanLog
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
    const { linestatus } = req.body; // Assuming status is passed in the request body
    if (linestatus) line.status = linestatus;
    await line.save();
    const thresholdMinutes = 30;

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

    if (efficiency === 0) {
      return res.status(200).json({
        message: 'Not enough data to predict material depletion',
        line
      });
    }

    const predictedTime = line.currentMaterialCount / efficiency;
    let notificationSent = false;

    if (predictedTime < thresholdMinutes) {
      console.log(`Notification: Material on line ${line._id} is low. Predicted depletion in ${predictedTime.toFixed(2)} minutes.`);
      notificationSent = true;
    }

    return res.status(200).json({
      message: 'Prediction calculated',
      lineId: line._id,
      model: line.model,
      currentMaterialCount: line.currentMaterialCount,
      totalOutputs: line.totalOutputs,
      timeElapsedMinutes: timeElapsedMinutes.toFixed(2),
      efficiencyPerMinute: efficiency.toFixed(2),
      predictedTimeToDepletion: predictedTime.toFixed(2),
      notificationSent
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
