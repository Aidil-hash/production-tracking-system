// controllers/engineerController.js
const Line = require('../models/Line');
const ScanLog = require('../models/ScanRecord');

const getAnalytics = async (req, res) => {
  try {
    // Ensure that only engineers can access this endpoint
    if (req.user.role !== 'engineer') {
      return res.status(403).json({ message: 'Access denied. Only engineers can view analytics.' });
    }

    const { lineId } = req.params;
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

    const predictedTime = line.currentMaterialCount / efficiency;
    let notificationSent = false;

    if (predictedTime < thresholdMinutes) {
      console.log(`Notification: Material on line ${line._id} is low. Predicted depletion in ${predictedTime.toFixed(2)} minutes.`);
    }

    return res.status(200).json({
      lineId: line._id,
      model: line.model,
      currentMaterialCount: line.currentMaterialCount,
      totalOutputs: line.totalOutputs,
      timeElapsedMinutes: timeElapsedMinutes.toFixed(2),
      efficiencyPerMinute: efficiency.toFixed(2),
      predictedTimeToDepletion: predictedTime.toFixed(2),
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

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

  // NEW FUNCTION: Detach operator from a line
const detachOperatorFromLine = async (req, res) => {
  try {
    // Ensure the requester is a leader
    if (req.user.role !== 'engineer') {
      return res.status(403).json({
        message: 'Access denied. Only engineer can detach operators from lines.'
      });
    }

    // Expect the lineId in the request body
    const { lineId } = req.body;
    if (!lineId) {
      return res.status(400).json({ message: 'lineId is required.' });
    }

    // Update the production line to remove the assigned operator
    const updatedLine = await ProductionLine.findByIdAndUpdate(
      lineId,
      { operatorId: null }, // or undefined, depending on your schema
      { new: true }
    );

    if (!updatedLine) {
      return res.status(404).json({ message: 'Production line not found.' });
    }

    return res.status(200).json({
      message: 'Operator detached from line successfully.',
      line: updatedLine
    });
  } catch (error) {
    console.error('Error detaching operator from line:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { 
  getAnalytics,
  getScanLogs,
  getAllScans,
  assignLineToOperator,
  detachOperatorFromLine
 };
