// models/ScanRecord.js
const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  productionLine: { type: mongoose.Schema.Types.ObjectId, ref: 'Line', required: true },
  operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serialNumber: { type: String, required: true },
  scannedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScanRecord', scanLogSchema);
