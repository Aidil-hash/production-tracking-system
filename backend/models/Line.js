// models/Line.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const lineSchema = new Schema({
  model: { type: String, required: true },
  currentMaterialCount: { type: Number, default: 0 },
  totalOutputs: { type: Number, default: 0 },
  startTime: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Line', lineSchema);