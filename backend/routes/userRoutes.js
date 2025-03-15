// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { createUser, getUsers, deleteUser, updateUser } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/users - Create a new user
router.post('/', createUser);

// GET /api/users - Get all users
router.get('/', getUsers);

// DELETE /api/users/:id
router.delete('/:id', verifyToken, deleteUser);

// PUT /api/users/:id
router.put('/:id', verifyToken, updateUser);

module.exports = router;
