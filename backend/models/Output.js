const mongoose = require('mongoose');
const outputSchema = new mongoose.Schema({
  lineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Line', required: true },
  timestamp: { type: Date, required: true },
  count: { type: Number, required: true },
});
module.exports = mongoose.model('Output', outputSchema);
