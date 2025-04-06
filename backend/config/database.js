// db.js

const mongoose = require('mongoose');
const DB_URI = process.env.DB_URI; // Replace with your database name

const connectDB = async () => {
  try {
    // Replace the connection string with your local or Atlas URI
    await mongoose.connect(DB_URI, {
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