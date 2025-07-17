const Order = require("../../models/User/OrderModel")


const cancelOrder = async (req, res) => {  
  const { orderId } = req.params;
  const { reason } = req.body;

  try {
    const order = await Order.findById(orderId);
    console.log("order found", order); 

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ error: 'Order already delivered and cannot be cancelled' });
    }

    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ error: 'Order is already cancelled' });
    }

    order.orderStatus = 'Cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || '';
    await order.save();

    res.status(200).json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Cancel Order Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {cancelOrder};

