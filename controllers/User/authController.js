const User = require('../../models/User/AuthModel');
const Address = require('../../models/User/AddressModel');
const jwt = require('jsonwebtoken');

// Register a new user
const register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({ username, email, password });
        await user.save();

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        res.status(201).json({ token, userId: user._id });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Login user
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare passwords
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        res.status(200).json({ token, userId: user._id });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get user profile with addresses
const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch user details
        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch user's addresses
        const addresses = await Address.find({ user: userId });

        res.status(200).json({ user, addresses });
    } catch (err) {
        res.status(500).json({ message: "Error fetching user profile", error: err.message });
    }
};

module.exports = { register, login, getUserProfile };
