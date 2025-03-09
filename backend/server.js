require('dotenv').config();

const express = require('express');
const connectDB = require('./config/database'); // adjust path if needed
const cors = require('cors');
const path = require('path');

const app = express();

// Set up CORS
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
const lineRoutes = require('./routes/lineRoutes');
const authRoutes = require('./routes/authRoutes');
const leaderRoutes = require('./routes/leaderRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const engineerRoutes = require('./routes/engineerRoutes');

// Use the routes
app.use('/api/leaders', leaderRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/engineer', engineerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lines', lineRoutes);
app.use('/api/auth', authRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.send('Hello, Production App!');
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// --- Socket.IO Integration ---
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Store the Socket.IO instance in app locals for use in controllers
app.set('io', io);

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export the app for testing
module.exports = app;

// Start the server only if this file is run directly (not imported)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT,'0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}
