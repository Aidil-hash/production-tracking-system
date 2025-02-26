// server.js

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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
