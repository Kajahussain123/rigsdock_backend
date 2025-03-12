const Order = require('../../../models/User/OrderModel');

// get total earnings from delivered orders
exports.getTotalEarnings = async (req, res) => {
  try {
    // Find all orders with status "Delivered"
    const deliveredOrders = await Order.find({ paymentStatus: "Paid" });

    // Calculate total earnings by summing up the totalPrice of delivered orders
    const totalEarnings = deliveredOrders.reduce(
      (total, order) => total + order.totalPrice,
      0
    );

    // Send the response with the total earnings
    res.status(200).json(totalEarnings);
  } catch (error) {
    console.error("Error calculating total earnings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate total earnings",
      error: error.message,
    });
  }
};