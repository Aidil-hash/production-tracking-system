// controllers/leaderController.js
const ProductionLine = require('../models/Line');

const getAssignedLineForLeader = async (req, res) => {
  try {
    // Ensure the requester has a leader role
    if (req.user.role !== 'leader') {
      return res.status(403).json({ message: 'Access denied. Only leaders can access assigned line.' });
    }

    // Find a production line assigned to this leader.
    // You might want to adjust this query if a leader can have multiple lines.
    const assignedLine = await ProductionLine.findOne({ leaderId: req.user.id });

    if (!assignedLine) {
      return res.status(404).json({ message: 'No assigned production line found.' });
    }

    // Return the assigned line info (you can customize what to return)
    return res.status(200).json({
      lineId: assignedLine._id.toString(),
      model: assignedLine.model,
      currentMaterialCount: assignedLine.currentMaterialCount,
      totalOutputs: assignedLine.totalOutputs,
      startTime: assignedLine.startTime,
    });
  } catch (error) {
    console.error('Error fetching assigned line:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// New function to assign a production line to an operator
const assignLineToOperator = async (req, res) => {
    try {
      // Check that the requester is a leader
      if (req.user.role !== 'leader') {
        return res.status(403).json({ message: 'Access denied. Only leaders can assign lines.' });
      }
  
      // Get the line ID and operator ID from the request body
      const { lineId, operatorId } = req.body;
      if (!lineId || !operatorId) {
        return res.status(400).json({ message: 'lineId and operatorId are required.' });
      }
  
      // Update the production line with the provided operatorId
      const updatedLine = await ProductionLine.findByIdAndUpdate(
        lineId,
        { operatorId },
        { new: true }
      );
  
      if (!updatedLine) {
        return res.status(404).json({ message: 'Production line not found.' });
      }
  
      return res.status(200).json({
        message: 'Line assigned successfully.',
        line: updatedLine,
      });
    } catch (error) {
      console.error('Error assigning line:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

module.exports = { 
    getAssignedLineForLeader,
    assignLineToOperator,
 };
