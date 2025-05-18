// models/User.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ['operator', 'FG operator', 'leader', 'supervisor', 'engineer', 'admin'],
    required: true
  },
  password: { type: String, required: true }
});

module.exports = mongoose.model('User', userSchema);