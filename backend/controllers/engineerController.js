// controllers/engineerController.js
const Line = require('../models/Line');
const ScanLog = require('../models/ScanRecord');

const getScanLogs = async (req, res) => {
  try {

    // Read the line ID from the query parameter
    const { lineId } = req.params;
    if (!lineId) {
      return res.status(400).json({ message: 'Line ID is required as a query parameter.' });
    }

    // Ensure the production line exists
    const line = await Line.findById(lineId);
    if (!line) {
      return res.status(404).json({ message: 'Line not found' });
    }

    // Find scan logs for the given production line and populate related fields
    const logs = await ScanLog.find({ Line: lineId })
      .populate('Line', 'model')
      .populate('operator', 'name')
      .sort({ scannedAt: -1 });

    // Transform logs into an array of objects: one with operator names, and one with scanned serial numbers
    const scanData = logs.map(log => ({
      operator: log.operator ? log.operator.name : 'Unknown',
      serialNumber: log.serialNumber,
      scannedAt: log.scannedAt
    }));

    // Extract unique operator names from the logs
    const operators = [...new Set(scanData.map(data => data.operator))];

    return res.status(200).json({
      lineId: line._id,
      model: line.model,
      operators,
      scanLogs: scanData
    });
  } catch (error) {
    console.error("Error fetching scan logs:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllScans = async (req, res) => {
  try {
    // Ensure that only engineers can access
    if (req.user.role !== 'engineer') {
      return res.status(403).json({ message: "Access denied. Only engineers can view all scans." });
    }

    // Fetch all scan logs from the DB
    const logs = await ScanLog.find({})
      .populate('productionLine', 'model')
      .populate('operator', 'name')
      .sort({ scannedAt: -1 });

    // Return the raw logs or transform them
    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching all scan logs:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getScanLogsByLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    const logs = await ScanLog.find({ productionLine: lineId })
      .populate('operator', 'name')
      .sort({ scannedAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

  // NEW FUNCTION: Detach operator from a line
const detachOperatorFromLine = async (req, res) => {
  try {
    if (req.user.role !== 'engineer') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { lineId, operatorId } = req.body;
    if (!lineId || !operatorId) {
      return res.status(400).json({ message: 'lineId and operatorId are required.' });
    }

    const updatedLine = await Line.findByIdAndUpdate(
      lineId,
      { $pull: { operatorIds: operatorId } },
      { new: true }
    );

    if (!updatedLine) {
      return res.status(404).json({ message: 'Production line not found.' });
    }

    res.status(200).json({
      message: 'Operator detached successfully.',
      line: updatedLine
    });
  } catch (error) {
    console.error('Detach operator error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addOperatorToLine = async (req, res) => {
  try {

    const { lineId, operatorId } = req.body;
    if (!lineId || !operatorId) {
      return res.status(400).json({ message: 'lineId and operatorId are required.' });
    }

    const updatedLine = await Line.findByIdAndUpdate(
      lineId,
      { $addToSet: { operatorIds: operatorId } },
      { new: true }
    );

    if (!updatedLine) {
      return res.status(404).json({ message: 'Line not found.' });
    }

    res.status(200).json({
      message: 'Operator added to line.',
      line: updatedLine
    });
  } catch (error) {
    console.error('Add operator error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { 
  getScanLogs,
  getAllScans,
  getScanLogsByLine,
  addOperatorToLine,
  detachOperatorFromLine
 };
