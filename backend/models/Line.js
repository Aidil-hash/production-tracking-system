// models/Line.js

const mongoose = require('mongoose');
const productionLineSchema = new mongoose.Schema({
  model: { type: String, required: true },
  currentMaterialCount: { type: Number, default: 0 },
  totalOutputs: { type: Number, default: 0 },
  targetOutputs: { type: Number, default: 0 },
  linestatus: { type: String },
  department: { type: String, required: true },
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // assigned leader
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // assigned operator
  startTime: { type: Date, default: Date.now },

  efficiencyHistory: [{
    timestamp: { type: Date, required: true, default: Date.now },
    efficiency: { type: Number, required: true }
  }],
});

module.exports = mongoose.model('Line', productionLineSchema);