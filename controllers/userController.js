// controllers/userController.js

const { users, ROLES } = require('../models/userModel');

// Create a new user
const createUser = (req, res) => {
  const { name, role } = req.body;

  // Basic validation
  if (!name || !role) {
    return res.status(400).json({ message: 'Name and role are required' });
  }

  // Check if role is valid
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ message: 'Invalid role provided' });
  }

  const newUser = {
    id: users.length + 1, // simplistic ID generation
    name,
    role
  };

  users.push(newUser);

  return res.status(201).json({ message: 'User created', user: newUser });
};

// Get all users
const getUsers = (req, res) => {
  return res.status(200).json(users);
};

module.exports = {
  createUser,
  getUsers
};
