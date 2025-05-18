// controllers/authController.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const secretKey = process.env.JWT_SECRET || 'your_secret_key';

const login = async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findOne({ name });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare hashed password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      secretKey,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ message: 'Login successful', token, urole: user.role, name: user.name });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { login };
