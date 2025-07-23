const User = require('../../../models/User/AuthModel');
const Order = require('../../../models/User/OrderModel');

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

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const orders = await Order.find({ user: id }).sort({ createdAt: -1 });
    const totalOrders = await Order.countDocuments({ user: id });

    res.status(200).json({
      user,
      orders,
      totalOrders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user by ID', error: error.message });
  }
};
