// controllers/authController.js

const jwt = require('jsonwebtoken');
const { users } = require('../models/userModel');

const secretKey = 'your_secret_key'; // In production, store this in an environment variable.

const login = (req, res) => {
  const { name, password } = req.body;

  // Find the user by name and check the password
  const user = users.find(u => u.name === name && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Create a JWT token with user info (id, role, name)
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    secretKey,
    { expiresIn: '1h' }
  );
  return res.status(200).json({ message: 'Login successful', token });
};

module.exports = { login };