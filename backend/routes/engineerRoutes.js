// routes/engineerRoutes.js
const express = require('express');
const router = express.Router();
const { getAnalytics, getScanLogs, getAllScans } = require('../controllers/engineerController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assumes you have token verification middleware

// GET /api/engineer/analytics - Get analytics data for engineers
router.get('/:lineId/analytics', verifyToken, getAnalytics);
router.get('/:lineId/scanlogs', verifyToken, getScanLogs);
router.get('/allscanlogs', verifyToken, getAllScans);

// New endpoint for assigning a production line to an operator
router.put('/assignLine', verifyToken, assignLineToOperator);

// Detach operator route
router.put('/detachOperator', verifyToken, detachOperatorFromLine);

module.exports = router;
