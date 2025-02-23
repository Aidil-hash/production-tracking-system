// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { createUser, getUsers } = require('../controllers/userController');

// POST /api/users - Create a new user
router.post('/', createUser);

// GET /api/users - Get all users
router.get('/', getUsers);

module.exports = router;
