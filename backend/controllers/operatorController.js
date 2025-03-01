// controllers/operatorController.js
const ProductionLine = require('../models/Line');

const getAssignedLineForOperator = async (req, res) => {
  try {
    // Ensure the requester is an operator
    if (req.user.role !== 'operator') {
      return res.status(403).json({ message: 'Access denied. Only operators can access assigned line.' });
    }

    // Query for a production line assigned to this operator.
    // Adjust this query if an operator can have multiple lines.
    const assignedLine = await ProductionLine.findOne({ operatorId: req.user.id });

    if (!assignedLine) {
      return res.status(404).json({ message: 'No assigned production line found.' });
    }

    return res.status(200).json({
      lineId: assignedLine._id.toString(),
      model: assignedLine.model,
      currentMaterialCount: assignedLine.currentMaterialCount,
      totalOutputs: assignedLine.totalOutputs,
      startTime: assignedLine.startTime,
    });
  } catch (error) {
    console.error('Error fetching assigned line for operator:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getAssignedLineForOperator };
