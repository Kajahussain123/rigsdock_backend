const express = require('express');
const { sendOTP, verifyOTP, registerWithMobile ,getUserProfile } = require('../../controllers/User/authController');

const router = express.Router();

// Send OTP route
router.post('/send-otp', sendOTP);

// Verify OTP route
router.post('/verify-otp', verifyOTP);

// Register with verified mobile number route
router.post('/register-with-mobile', registerWithMobile);


router.get('/profile/:userId', getUserProfile);

module.exports = router;