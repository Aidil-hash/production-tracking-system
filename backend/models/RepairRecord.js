const mongoose = require('mongoose');

const repairRecordSchema = new mongoose.Schema({
	model: { type: String, required: true },
  serialNumber: { type: String, required: true },
  reason: { type: String, required: true },
  technicianName: { type: String, required: true },
  repairedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RepairRecord', repairRecordSchema);
