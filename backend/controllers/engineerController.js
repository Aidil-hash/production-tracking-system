// controllers/engineerController.js
const Line = require('../models/Line');
const ScanLog = require('../models/ScanRecord');
const { decryptSerial } = require('../utils/serialCrypto');

const getAllScans = async (req, res) => {
  try {
    const logs = await ScanLog.find()
      .populate('operator', 'name')
      .sort({ scannedAt: -1 });

    // Decrypt serial numbers before sending
    const decryptedLogs = logs.map(log => ({
      ...log.toObject(),
      serialNumber: log.serialNumber ? decryptSerial(log.serialNumber) : '',
    }));

    return res.status(200).json(decryptedLogs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getScanLogsByLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    const logs = await ScanLog.find({ productionLine: lineId })
      .populate('operator', 'name')
      .sort({ scannedAt: -1 });

    // Safe decryption: never crash on one bad record
    const decryptedLogs = logs.map(log => {
      let serial = '';
      try {
        serial = log.serialNumber ? decryptSerial(log.serialNumber) : '';
      } catch (err) {
        serial = '[decryption error]';
      }
      return {
        ...log.toObject(),
        serialNumber: serial,
      };
    });

    res.json(decryptedLogs);
  } catch (error) {
    // Log to server console for debug!
    console.error("Error in getScanLogsByLine:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    const updatedLine = await Line.findByIdAndUpdate(
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

// NEW FUNCTION: Attach operator to a line (supports multiple operators)
const attachOperatorToLine = async (req, res) => {
  try {
    // Ensure the requester is an engineer
    if (req.user.role !== 'engineer') {
      return res.status(403).json({
        message: 'Access denied. Only engineer can attach operators to lines.'
      });
    }

    // Expect the lineId and operatorId in the request body
    const { lineId, operatorId } = req.body;
    if (!lineId || !operatorId) {
      return res.status(400).json({ message: 'lineId and operatorId are required.' });
    }

    // Add the operatorId to the operatorIds array, but only if not already present
    const updatedLine = await Line.findByIdAndUpdate(
      lineId,
      { $addToSet: { operatorIds: operatorId } },
      { new: true }
    );

    if (!updatedLine) {
      return res.status(404).json({ message: 'Production line not found.' });
    }

    return res.status(200).json({
      message: 'Operator attached to line successfully.',
      line: updatedLine
    });
  } catch (error) {
    console.error('Error attaching operator to line:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { 
  getAllScans,
  getScanLogsByLine,
  attachOperatorToLine,
  detachOperatorFromLine
 };
