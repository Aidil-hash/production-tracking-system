// controllers/userController.js

const User = require('../models/User'); // The new Mongoose model

// Create a new user
// Create a new user with a password
const createUser = async (req, res) => {
  try {
  const { name, role, password } = req.body;

  // Basic validation
  if (!name || !role || !password) {
    return res.status(400).json({ message: 'Name, Role, and Password are required' });
  }

  // Create and save user in MongoDB
  const newUser = new User({ name, role, password });
  await newUser.save();

  // Return user without password
  const { password: _, ...userData } = newUser.toObject();
  return res.status(201).json({ message: 'User created', user: userData });
} catch (error) {
  console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
  // Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    // Remove password before sending
    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);
    return res.status(200).json(usersWithoutPassword);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createUser,
  getUsers
};
