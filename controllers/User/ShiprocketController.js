const MainOrder = require('../../models/User/MainOrderModel');
const Order = require('../../models/User/OrderModel');
const { getSpecificOrderDetails,cancelShiprocketOrder,trackOrderById } = require('../../controllers/Shiprocket/ShipRocketController');

// Route for user order by id
exports.getOrderDetailsById = async (req, res) => {
  try {
    const { orderId } = req.body;
    const { userId } = req.body;

    // Find the specific sub-order belonging to this vendor
    const subOrder = await Order.findOne({
      _id: orderId,
      user: userId // Ensure the order belongs to this vendor
    })

    if (!subOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to this vendor'
      });
    }

    let trackingInfo = null;
    
    if (subOrder.shiprocketOrderId) {
      trackingInfo = await getSpecificOrderDetails(subOrder.shiprocketOrderId);
      
      // Optional: Update order status if it's changed in Shiprocket
      if (trackingInfo && trackingInfo.status !== subOrder.orderStatus) {
        subOrder.orderStatus = trackingInfo.status;
        await subOrder.save();
      }
    }

    return res.status(200).json({
      success: true,
      order: {
        orderDetails: subOrder,
        tracking: trackingInfo
      }
    });

  } catch (error) {
    console.error('Error tracking vendor order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to track order',
      error: error.message
    });
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

exports.trackUserOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const {userId} = req.body

    // Optional: Verify the order belongs to the requesting user
    const orderExists = await Order.findOne({ _id: orderId, user: userId });
    if (!orderExists) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to track this order'
      });
    }

    // Track the order using Shiprocket
    const trackingData = await trackOrderById(orderId);

    return res.status(200).json({
      success: true,
      message: 'Order tracking successful',
      data: {
        order: trackingData.orderDetails,
        tracking: trackingData.trackingInfo
      }
    });

  } catch (error) {
    console.error('Order tracking error:', error.message);

    // Handle different error scenarios
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('not yet processed') ? 400 : 
                      500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to track order',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};