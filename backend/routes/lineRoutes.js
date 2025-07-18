const express = require('express');
const router = express.Router();
const {
  createLine,
  updateLine,
  scanSerial,
  validateSerial,
  getLineFromSerial,
  getLine,
  getAllLines,
  getLineEfficiency,
  startLine,
  getModelsRun,
  getPendingSecondVerification,
  resetLinesAtDayEnd,
  deleteLine
} = require('../controllers/lineController');

const { verifyToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Possible roles, if you want to reference them:
const { ROLES } = require('../models/userModel');

// POST /api/lines - Only a Leader or Supervisor can create a new line
router.post(
  '/',
  verifyToken,
  authorizeRoles(ROLES.LEADER, ROLES.SUPERVISOR, ROLES.ENGINEER),
  createLine
);

// GET /api/lines - Get all production lines
router.get('/', getAllLines );

// GET /api/lines/:lineId - Get a specific production line
router.get('/:lineId', verifyToken, getLine);

// PUT /api/lines/:lineId - Only a Leader or Supervisor can update a line
router.put(
  '/:lineId',
  verifyToken,
  authorizeRoles(ROLES.LEADER, ROLES.SUPERVISOR, ROLES.ENGINEER),
  updateLine
);

// POST /api/lines/:lineId/scan - Only an Operator can scan
router.post(
  '/:lineId/scan',
  verifyToken,
  scanSerial
);

// POST /api/lines/validate - Validate serial number
router.post(
  '/validate',
  verifyToken,
  validateSerial
);

// GET /api/lines/serial/:serialNumber - Get line from serial number
router.get(
  '/serial/:serialNumber',
  verifyToken,
  getLineFromSerial
);

// GET /api/lines/:lineId/efficiency - Calculate efficiency
router.get('/:lineId/efficiency', verifyToken, getLineEfficiency);

// PATCH /api/lines/:lineId/start - Start the production line
router.patch('/:lineId/start', startLine);

// GET /api/lines/:lineId/pending-verification - Get pending second verification
router.get('/:lineId/pending-verification', verifyToken, getPendingSecondVerification);

// GET /api/lines/:lineId/models-run - Get models run
router.get('/:lineId/models-run', verifyToken, getModelsRun);

// POST /api/lines/reset - Reset lines at day end
router.post('/reset', verifyToken, resetLinesAtDayEnd);

// DELETE /api/lines/:id
router.delete('/:id', verifyToken, deleteLine);

module.exports = router;
