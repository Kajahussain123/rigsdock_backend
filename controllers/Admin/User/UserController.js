const User = require('../../../models/User/AuthModel');

// get all users
exports.getAllUsers = async(req,res) => {
    try {
        const users = await User.find().select('-password').sort({createdAt: -1});
        if(users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }
        res.status(200).json(users)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
}