// routes/engineerRoutes.js
const express = require('express');
const router = express.Router();
const { getAllScans, getScanLogsByLine, detachOperatorFromLine } = require('../controllers/engineerController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assumes you have token verification middleware

router.get('/allscanlogs', verifyToken, getAllScans);
router.get('/scanlogs/:lineId', verifyToken, getScanLogsByLine);

// Detach operator route
router.put('/detachOperator', verifyToken, detachOperatorFromLine);

module.exports = router;
