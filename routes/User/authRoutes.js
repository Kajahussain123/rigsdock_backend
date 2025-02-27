const express = require('express');
const { register, login, getUserProfile } = require('../../controllers/User/authController');

const router = express.Router();

// Register route
router.post('/register', register);

// Login route
router.post('/login', login);

// Get user profile including addresses
router.get('/profile/:userId', getUserProfile);

module.exports = router;
