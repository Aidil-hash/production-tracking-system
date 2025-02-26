// server.js
require('dotenv').config();

const express = require('express');
const connectDB = require('./config/database'); // adjust path if needed
const app = express();
const port = 3000;
// Connect to MongoDB
connectDB();

app.use(express.json());
// Existing routes
const userRoutes = require('./routes/userRoutes');

// New line routes
const lineRoutes = require('./routes/lineRoutes');

// Middleware
const authRoutes = require('./routes/authRoutes');

// Basic test route
app.get('/', (req, res) => {
  res.send('Hello, Production App!');
});

// User routes
app.use('/api/users', userRoutes);

// Production line routes
app.use('/api/lines', lineRoutes);

app.use('/api/auth', authRoutes);

module.exports = app; // export the app for testing

if (require.main === module) {
  // Only start listening if this file is run directly (not imported by test)
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}