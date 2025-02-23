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

// POST /api/lines - Create a new production line
router.post('/', createLine);

// GET /api/lines - Get all production lines
router.get('/', getAllLines);

// GET /api/lines/:lineId - Get a specific production line
router.get('/:lineId', getLine);

// PUT /api/lines/:lineId - Update a production line
router.put('/:lineId', updateLine);

// POST /api/lines/:lineId/scan - Operator scans a serial number
router.post('/:lineId/scan', scanSerial);

// GET /api/lines/:lineId/efficiency - Calculate efficiency
router.get('/:lineId/efficiency', getLineEfficiency);

// GET /api/lines/:lineId/predict - Predict low material and trigger notification
router.get('/:lineId/predict', predictMaterialLow);

module.exports = router;
