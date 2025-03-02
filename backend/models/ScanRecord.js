// models/ScanRecord.js
const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  productionLine: { type: mongoose.Schema.Types.ObjectId, ref: 'Line', required: true },
  model: { type: String, required: true },
  operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  serialNumber: { type: String, required: true },
  scannedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to populate lineModel and operatorName
scanLogSchema.pre('save', async function(next) {
  try {
    if (this.isModified('productionLine') || !this.lineModel) {
      const Line = mongoose.model('Line');
      const line = await Line.findById(this.productionLine);
      if (line) {
        this.lineModel = line.model;
      }
    }
    
    if (this.isModified('operator') || !this.operatorName) {
      const User = mongoose.model('User');
      const operator = await User.findById(this.operator);
      if (operator) {
        this.operatorName = operator.name;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('ScanRecord', scanLogSchema);
