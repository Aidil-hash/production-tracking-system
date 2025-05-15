// routes/engineerRoutes.js
const express = require('express');
const router = express.Router();
const { getAnalytics, getScanLogs, getAllScans, assignLineToOperator, detachOperatorFromLine } = require('../controllers/engineerController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assumes you have token verification middleware

// GET /api/engineer/analytics - Get analytics data for engineers
router.get('/:lineId/analytics', verifyToken, getAnalytics);
router.get('/:lineId/scanlogs', verifyToken, getScanLogs);
router.get('/allscanlogs', verifyToken, getAllScans);

// Detach operator route
router.put('/detachOperator', verifyToken, detachOperatorFromLine);

module.exports = router;
