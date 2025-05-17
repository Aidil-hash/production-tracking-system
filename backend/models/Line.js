// models/Line.js

const mongoose = require('mongoose');
const productionLineSchema = new mongoose.Schema({
  model: { type: String, required: true },
  totalOutputs: { type: Number, default: 0 },
  targetOutputs: { type: Number, default: 0 },
  linestatus: { type: String },
  department: { type: String, required: true },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // assigned operator
  targetEfficiency: { type: Number, default: 0 }, // target efficiency
  startTime: { type: Date, default: 0 }, // start time of the line

  efficiencyHistory: [{
    timestamp: { type: Date, required: true, default: Date.now },
    efficiency: { type: Number, required: true }
  }],
});

module.exports = mongoose.model('Line', productionLineSchema);