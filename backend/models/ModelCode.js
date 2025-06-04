const mongoose = require('mongoose');

const modelCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g. 'ABC123'
  modelName: { type: String, required: true },          // e.g. 'E3 Compact'
  // Optionally add: description, etc.
});

module.exports = mongoose.model('ModelCode', modelCodeSchema);
