// routes/leaderRoutes.js
const express = require('express');
const router = express.Router();
const { getAssignedLineForLeader, assignLineToOperator } = require('../controllers/leaderController');
const { verifyToken } = require('../middleware/authMiddleware');

// Endpoint to get the leader's assigned production line
router.get('/assignedLine', verifyToken, getAssignedLineForLeader);

// New endpoint for assigning a production line to an operator
router.put('/assignLine', verifyToken, assignLineToOperator);

// Example route in routes/leaderRoutes.js
router.get('/', verifyToken, async (req, res) => {
    try {
      const leaders = await User.find({ role: 'leader' });
      res.status(200).json(leaders);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

module.exports = router;
