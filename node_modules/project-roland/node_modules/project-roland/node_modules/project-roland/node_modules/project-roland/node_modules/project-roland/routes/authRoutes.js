// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// POST /api/auth/login - Authenticate a user and return a token
router.post('/login', login);

module.exports = router;