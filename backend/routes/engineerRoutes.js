// routes/engineerRoutes.js
const express = require('express');
const router = express.Router();
const { getScanLogs, getAllScans, getScanLogsByLine, detachOperatorFromLine, addOperatorToLine } = require('../controllers/engineerController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assumes you have token verification middleware

router.get('/:lineId/scanlogs', verifyToken, getScanLogs);
router.get('/allscanlogs', verifyToken, getAllScans);
router.get('/scanlogs/:lineId', verifyToken, getScanLogsByLine);
router.post('/addOperator/:lineId', verifyToken, addOperatorToLine);

// Detach operator route
router.put('/detachOperator', verifyToken, detachOperatorFromLine);

module.exports = router;
