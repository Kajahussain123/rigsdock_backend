const User = require('../../models/User/AuthModel');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const TWO_FACTOR_API_KEY = '411421e5-c758-11ef-8b17-0200cd936042'; // Replace with your 2Factor API key

// Send OTP to mobile number
const sendOTP = async (req, res) => {
    const { mobileNumber } = req.body;

    try {
        // Send OTP using 2Factor API
        const response = await axios.get(
            `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${mobileNumber}/AUTOGEN`
        );
        const sessionId = response.data.Details;

        res.status(200).json({ sessionId, message: 'OTP sent successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    const { sessionId, otp, mobileNumber } = req.body;

    try {
        // Verify OTP using 2Factor API
        const response = await axios.get(
            `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
        );

        if (response.data.Details === 'OTP Matched') {
            // Check if the user is already registered
            const user = await User.findOne({ mobileNumber });

            if (user) {
                // User is registered, generate JWT token and log them in
                const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                    expiresIn: '1h',
                });
                return res.status(200).json({ token, userId: user._id, message: 'Login successful' });
            } else {
                // User is not registered, redirect to registration page
                return res.status(200).json({ 
                    redirectToRegister: true, 
                    mobileNumber, 
                    message: 'OTP verified. Please complete registration.' 
                });
            }
        } else {
            res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Register new user with verified mobile number
const registerWithMobile = async (req, res) => {
    const { name, email, mobileNumber } = req.body;

    try {
        // Check if mobile number is already registered
        const existingUser = await User.findOne({ mobileNumber });
        if (existingUser) {
            return res.status(400).json({ message: 'Mobile number already registered' });
        }

        // Create new user
        const user = new User({ name, email, mobileNumber, verified: true });
        await user.save();

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        res.status(201).json({ token, userId: user._id, message: 'User registered successfully' });
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

module.exports = { sendOTP, verifyOTP, registerWithMobile, getUserProfile  };