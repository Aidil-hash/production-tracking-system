// controllers/authController.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const secretKey = 'your_secret_key'; // Use env variable in production

const login = async (req, res) => {
  try {
    const { name, password } = req.body;
    // Find user in MongoDB
    const user = await User.findOne({ name });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      secretKey,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { login };