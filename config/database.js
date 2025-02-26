// db.js

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Replace the connection string with your local or Atlas URI
    await mongoose.connect('mongodb://localhost:27017/productionApp', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;