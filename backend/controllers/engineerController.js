// controllers/engineerController.js
const ProductionLine = require('../models/Line');
const ScanLog = require('../models/ScanRecord');

const getAnalytics = async (req, res) => {
  try {
    // Ensure that only engineers can access this endpoint
    if (req.user.role !== 'engineer') {
      return res.status(403).json({ message: 'Access denied. Only engineers can view analytics.' });
    }

    const { lineId } = req.params;
    const line = await ProductionLine.findById(lineId);
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
      timeElapsedMinutes: timeElapsedMinutes.toFixed(2),
      efficiencyPerMinute: efficiency.toFixed(2)
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getScanLogs = async (req, res) => {
  try {
    // Ensure that only engineers can access scan logs
    if (req.user.role !== 'engineer') {
      return res.status(403).json({ message: "Access denied. Only engineers can view scan logs." });
    }

    // Retrieve all scan logs, populating production line and operator information
    const logs = await ScanLog.find({})
      .populate('productionLine', 'model') // get the model field from production line
      .populate('operator', 'name'); // get the name from operator

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching scan logs:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { 
  getAnalytics,
  getScanLogs
 };
