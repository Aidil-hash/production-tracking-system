// routes/engineerRoutes.js
const express = require('express');
const router = express.Router();
const { getAnalytics, getScanLogs } = require('../controllers/engineerController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assumes you have token verification middleware

// GET /api/engineer/analytics - Get analytics data for engineers
router.get('/:lineId/analytics', verifyToken, getAnalytics);
router.get('/:lineId/scanlogs', verifyToken, getScanLogs);

module.exports = router;
