const User = require('../../models/User/AuthModel');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');

const TWO_FACTOR_API_KEY = 'ff7f43b4-15dc-11f0-8b17-0200cd936042';

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate random OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check if identifier is email or mobile
const isEmail = (identifier) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
};

// Store OTPs temporarily (in production use Redis)
const otpStore = new Map();

// Send OTP to email or mobile
const sendOTP = async (req, res) => {
  const { identifier } = req.body;

  try {
    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000; // OTP valid for 5 minutes

    if (isEmail(identifier)) {
      // Send OTP via email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: identifier,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It will expire in 5 minutes.`
      };

      await transporter.sendMail(mailOptions);
      
      // Store OTP with email
      otpStore.set(identifier, { otp, expiry: otpExpiry });
      
      res.status(200).json({
        identifierType: 'email',
        identifier,
        message: 'OTP sent to email'
      });
    } else {
      // Send OTP via SMS
      const response = await axios.get(
        `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${identifier}/${otp}`
      );
      
      // Store OTP with mobile number
      otpStore.set(identifier, { otp, expiry: otpExpiry });
      
      res.status(200).json({
        identifierType: 'mobile',
        identifier,
        message: 'OTP sent to mobile'
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
};

// Verify OTP and handle login/registration
const verifyOTP = async (req, res) => {
  const { identifier, otp } = req.body;

  try {
    // Check if OTP exists and is valid
    const storedOtpData = otpStore.get(identifier);
    if (!storedOtpData || storedOtpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if OTP expired
    if (Date.now() > storedOtpData.expiry) {
      otpStore.delete(identifier);
      return res.status(400).json({ message: 'OTP expired' });
    }

    // OTP is valid, check if user exists
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { mobileNumber: identifier }
      ]
    });

    if (user) {
      // User exists - generate token and login
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
      
      // Clear OTP after successful verification
      otpStore.delete(identifier);
      
      return res.status(200).json({
        token,
        userId: user._id,
        message: 'Login successful'
      });
    } else {
      // User doesn't exist - prepare for registration
      // Determine what info we already have and what's needed
      const isEmailLogin = isEmail(identifier);
      
      // Clear OTP after verification (user will need new OTP if they abandon registration)
      otpStore.delete(identifier);
      
      return res.status(200).json({
        needsRegistration: true,
        [isEmailLogin ? 'email' : 'mobileNumber']: identifier,
        requires: isEmailLogin ? 'mobileNumber' : 'email',
        message: 'OTP verified. Please complete registration.'
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Complete registration
const completeRegistration = async (req, res) => {
  const { name, email, mobileNumber } = req.body;

  try {
    // Validate both email and mobile are provided
    if (!email || !mobileNumber) {
      return res.status(400).json({ 
        message: 'Both email and mobile number are required' 
      });
    }

    // Check if email or mobile already registered
    const existingUser = await User.findOne({
      $or: [
        { email },
        { mobileNumber }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      if (existingUser.mobileNumber === mobileNumber) {
        return res.status(400).json({ message: 'Mobile number already registered' });
      }
    }

    // Create new user
    const user = new User({ 
      name, 
      email, 
      mobileNumber, 
      verified: true 
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({
      token,
      userId: user._id,
      message: 'Registration successful'
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
const getUserProfile = async (req, res) => {
    const { userId } = req.params; // Extract user ID from URL params

    try {
        const user = await User.findById(userId).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { 
  sendOTP, 
  verifyOTP, 
  completeRegistration,
  getUserProfile 
};