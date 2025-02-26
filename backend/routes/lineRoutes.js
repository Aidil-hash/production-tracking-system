const express = require('express');
const router = express.Router();
const {
  createLine,
  updateLine,
  scanSerial,
  getLine,
  getAllLines,
  getLineEfficiency,
  predictMaterialLow
} = require('../controllers/lineController');

const { verifyToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Possible roles, if you want to reference them:
const { ROLES } = require('../models/userModel');

// POST /api/lines - Only a Leader or Supervisor can create a new line
router.post(
  '/',
  verifyToken,
  authorizeRoles(ROLES.LEADER, ROLES.SUPERVISOR),
  createLine
);

// GET /api/lines - Get all production lines
router.get('/', verifyToken, getAllLines);

// GET /api/lines/:lineId - Get a specific production line
router.get('/:lineId', verifyToken, getLine);

// PUT /api/lines/:lineId - Only a Leader or Supervisor can update a line
router.put(
  '/:lineId',
  verifyToken,
  authorizeRoles(ROLES.LEADER, ROLES.SUPERVISOR),
  updateLine
);

// POST /api/lines/:lineId/scan - Only an Operator can scan
router.post(
  '/:lineId/scan',
  verifyToken,
  authorizeRoles(ROLES.OPERATOR),
  scanSerial
);

// GET /api/lines/:lineId/efficiency - Calculate efficiency
router.get('/:lineId/efficiency', verifyToken, getLineEfficiency);

// GET /api/lines/:lineId/predict - Predict low material and trigger notification
router.get('/:lineId/predict', verifyToken, predictMaterialLow);

module.exports = router;
