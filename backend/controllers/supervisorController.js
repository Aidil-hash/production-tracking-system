// controllers/supervisorController.js
const ProductionLine = require('../models/Line');

const assignLineToLeader = async (req, res) => {
  try {
    // Only supervisors can assign lines to leaders.
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ message: 'Access denied. Only supervisors can assign lines to leaders.' });
    }

    // Extract production line ID and leader ID from the request body.
    const { lineId, leaderId } = req.body;
    if (!lineId || !leaderId) {
      return res.status(400).json({ message: 'lineId and leaderId are required.' });
    }

    // Update the production line by setting the leaderId.
    const updatedLine = await ProductionLine.findByIdAndUpdate(
      lineId,
      { leaderId },
      { new: true }
    );

    if (!updatedLine) {
      return res.status(404).json({ message: 'Production line not found.' });
    }

    return res.status(200).json({
      message: 'Line assigned to leader successfully.',
      line: updatedLine,
    });
  } catch (error) {
    console.error('Error assigning line to leader:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { assignLineToLeader };
