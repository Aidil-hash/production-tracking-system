// controllers/userController.js

const User = require('../models/User');
const bcrypt = require('bcrypt');

const createUser = async (req, res) => {
  try {
    const { name, role, password } = req.body;
    if (!name || !role || !password) {
      return res.status(400).json({ message: 'Name, role, and password are required' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create and save user
    const newUser = new User({ name, role, password: hashedPassword });
    await newUser.save();

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
    const users = await User.find({}).lean();
    // Remove password before sending
    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);
    return res.status(200).json(usersWithoutPassword);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if user has the right role (admin, supervisor, etc.) if needed
    if (req.user.role !== 'admin') { return res.status(403).json({ message: 'Forbidden' }); }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    
    // Additional checks (e.g., role-based auth) if needed
    if (req.user.role !== 'admin') { return res.status(403).json({ message: 'Forbidden' }); }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  deleteUser,
  updateUser
};