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

const cors = require('cors');
app.use(cors());

module.exports = app; // export the app for testing

const path = require('path');
// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

if (require.main === module) {
  // Only start listening if this file is run directly (not imported by test)
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}