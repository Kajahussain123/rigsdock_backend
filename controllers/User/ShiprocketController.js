const MainOrder = require('../../models/User/MainOrderModel');
const Order = require('../../models/User/OrderModel');
const { trackShipment,cancelShiprocketOrder } = require('../../controllers/Shiprocket/ShipRocketController');

// Route for users to track their orders
exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    const mainOrders = await MainOrder.find({ user: userId });
    const ordersWithTracking = [];

    for (const mainOrder of mainOrders) {
      const subOrders = await Order.find({ _id: { $in: mainOrder.subOrders } });
      const subOrdersWithTracking = [];

      for (const subOrder of subOrders) {
        let trackingInfo = null;
        
        if (subOrder.shiprocketOrderId) {
          trackingInfo = await trackShipment(subOrder.shiprocketOrderId);
        }
        
        subOrdersWithTracking.push({
          order: subOrder,
          tracking: trackingInfo
        });
      }

      ordersWithTracking.push({
        mainOrder,
        subOrders: subOrdersWithTracking
      });
    }

    return res.status(200).json({ success: true, orders: ordersWithTracking });
  } catch (error) {
    console.error('Error getting user orders:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Controller to cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Fetch the order from database
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderAgeInHours = (Date.now() - order.createdAt) / (1000 * 60 * 60);
    if (orderAgeInHours > 24) {
      return res.status(400).json({ 
        message: 'Cancellation window expired (24 hours)',
        hoursSinceOrder: Math.floor(orderAgeInHours)
      });
    }

    // 2. Validate if cancellation is possible
    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ message: 'Order already cancelled' });
    }

    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
    }

    // 3. Cancel in Shiprocket
    const cancelResponse = await cancelShiprocketOrder(order.shiprocketOrderId);
    
    // 4. Update order status in database
    order.orderStatus = 'Cancelled';
    await order.save();

    // 5. If this is a sub-order, check main order status
    if (order.mainOrderId) {
      const mainOrder = await MainOrder.findById(order.mainOrderId).populate('subOrders');
      
      // Check if all sub-orders are cancelled
      const allCancelled = mainOrder.subOrders.every(
        subOrder => subOrder.orderStatus === 'Cancelled'
      );
      
      if (allCancelled) {
        mainOrder.orderStatus = 'Cancelled';
        await mainOrder.save();
      }
    }

    res.status(200).json({
      message: 'Order cancelled successfully',
      cancellationData: cancelResponse,
      orderStatus: order.orderStatus
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      message: 'Error cancelling order',
      error: error.response?.data || error.message 
    });
  }
};