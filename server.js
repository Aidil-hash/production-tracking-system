const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies (useful for POST requests later)
app.use(express.json());

// A simple route to test the server
app.get('/', (req, res) => {
  res.send('Hello, Production App!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});