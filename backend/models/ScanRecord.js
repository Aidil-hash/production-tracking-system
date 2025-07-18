// models/ScanRecord.js
const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  productionLine: { type: mongoose.Schema.Types.ObjectId, ref: 'Line', required: true },
  model: { type: String, required: true },
  operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  serialNumber: { type: String, required: true },
  serialNumberHash: { type: String, required: true }, // <-- removed unique: true!
  serialStatus: { type: String, required: true },
  scannedAt: { type: Date, default: Date.now },

  // ---- NEW FIELDS FOR TWO-STAGE VERIFICATION ----
  verificationStage: { type: Number, default: 1 }, // 1: first pass, 2: fully verified
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // second verifier
  finalScanTime: { type: Date, default: null }, // time of second verification
  secondSerialStatus: { type: String, default: null }, // status after second verification
  secondVerifierName: { type: String, default: null },
});

// Compound unique index for serialNumberHash + serialStatus
scanLogSchema.index({ serialNumberHash: 1, serialStatus: 1 }, { unique: true });

// TTL index: Auto-delete after 3 days
scanLogSchema.index({ scannedAt: 1 }, { expireAfterSeconds: 259200 });

// (Optional: Pre-save hook for auto-populating names if you use it in your app)
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
