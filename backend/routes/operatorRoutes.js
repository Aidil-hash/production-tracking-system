// routes/operatorRoutes.js
const express = require('express');
const router = express.Router();
const { getAssignedLineForOperator } = require('../controllers/operatorController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assumes you have token verification

// GET /api/operators/assignedLine - get the production line assigned to the logged-in operator
router.get('/assignedLine', verifyToken, getAssignedLineForOperator);

module.exports = router;
