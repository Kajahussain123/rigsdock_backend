const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/Admin/Auth');

// Admin Registration
router.post('/register', adminController.registerAdmin);

// Admin Login
router.post('/login', adminController.login);

module.exports = router;
