// routes/supervisorRoutes.js
const express = require('express');
const router = express.Router();
const { assignLineToLeader } = require('../controllers/supervisorController');
const { verifyToken } = require('../middleware/authMiddleware');

// PUT /api/supervisors/assignLine - assign a production line to a leader
router.put('/assignLeader', verifyToken, assignLineToLeader);

module.exports = router;
