const mongoose = require('mongoose');

const hourlyTargetSchema = new mongoose.Schema({
  date: { type: String, required: true },
  slots: [{
    time: String,
    target: Number,
    actual: Number,
  }]
}, { _id: false });

// Track all models seen on this line (latest first)
const lineModelRunSchema = new mongoose.Schema({
  code: String,        // e.g. 'ABC123'
  modelName: String,   // e.g. 'E3 Compact'
  firstSeen: Date,     // first time this model run on this line
  lastSeen: Date       // last time this model was scanned on this line
}, { _id: false });

const productionLineSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Line name/number
  operatorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // assigned operators
  totalOutputs: { type: Number, default: 0 },
  targetOutputs: { type: Number, default: 0 },
  rejectedOutputs: { type: Number, default: 0 },
  linestatus: { type: String },
  department: { type: String, required: true },
  targetEfficiency: { type: Number, default: 0 },
  startTime: { type: Date, default: null },
  efficiencyHistory: [{
    timestamp: { type: Date, required: true, default: Date.now },
    efficiency: { type: Number, required: true },
    target: { type: Number, required: true },
    rejectedOutputs: { type: Number },
  }],
  hourlyTargets: [hourlyTargetSchema],
  modelRuns: [lineModelRunSchema] // Track all models ever run on this line
});

module.exports = mongoose.model('Line', productionLineSchema);
