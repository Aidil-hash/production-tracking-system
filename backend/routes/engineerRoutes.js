// routes/engineerRoutes.js
const express = require('express');
const router = express.Router();
const { getAllScans, getScanLogsByLine, detachOperatorFromLine, attachOperatorToLine } = require('../controllers/engineerController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assumes you have token verification middleware

router.get('/allscanlogs', verifyToken, getAllScans);
router.get('/scanlogs/:lineId', verifyToken, getScanLogsByLine);

// Detach operator route
router.put('/detachOperator', verifyToken, detachOperatorFromLine);

router.post('/addOperator/:lineId', verifyToken, attachOperatorToLine);

module.exports = router;
