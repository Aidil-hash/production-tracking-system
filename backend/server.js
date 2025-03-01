// server.js
require('dotenv').config();

const express = require('express');
const connectDB = require('./config/database'); // adjust path if needed
const app = express();

const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Connect to MongoDB
connectDB();

app.use(express.json());
// Existing routes
const userRoutes = require('./routes/userRoutes');

// New line routes
const lineRoutes = require('./routes/lineRoutes');

// Middleware
const authRoutes = require('./routes/authRoutes');

// Role Routes
const leaderRoutes = require('./routes/leaderRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const engineerRoutes = require('./routes/engineerRoutes');

// Use the routes
app.use('/api/leaders', leaderRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/engineer', engineerRoutes);

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

const path = require('path');
// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

if (require.main === module) {
  // Only start listening if this file is run directly (not imported by test)
  app.listen(5000, () => {
    console.log('Server running on port 5000');
  });
}