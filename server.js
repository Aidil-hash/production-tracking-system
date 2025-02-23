// server.js

const express = require('express');
const app = express();
const port = 3000;

// Existing routes
const userRoutes = require('./routes/userRoutes');

// New line routes
const lineRoutes = require('./routes/lineRoutes');

// Middleware
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
  res.send('Hello, Production App!');
});

// User routes
app.use('/api/users', userRoutes);

// Production line routes
app.use('/api/lines', lineRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
