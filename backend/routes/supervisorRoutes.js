// routes/supervisorRoutes.js
const express = require('express');
const router = express.Router();
const { assignLineToLeader, detachLeaderFromLine } = require('../controllers/supervisorController');
const { verifyToken } = require('../middleware/authMiddleware');

// PUT /api/supervisors/assignLine - assign a production line to a leader
router.put('/assignLeader', verifyToken, assignLineToLeader);

// PUT /api/supervisors/detachLeader - detach the leader from a production line
router.put('/detachLeader', verifyToken, detachLeaderFromLine);

module.exports = router;
