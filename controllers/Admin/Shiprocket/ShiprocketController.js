const Order = require('../../../models/User/OrderModel');
const { getAllOrderDetails,getSpecificOrderDetails,trackOrderById } = require('../../../controllers/Shiprocket/ShipRocketController');

// Route for user order by id
exports.getAllOrderDetailsFun = async (req, res) => {
  try {

    const allOrderDetails = await getAllOrderDetails();
      

    return res.status(200).json({
      success: true,
      total: allOrderDetails.data.length,
      allOrderDetails
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

exports.getOrderDetailsById = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find the specific sub-order belonging to this vendor
    const subOrder = await Order.findOne({ _id: orderId })

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

exports.trackUserOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Optional: Verify the order belongs to the requesting user
    const orderExists = await Order.findOne({ _id: orderId });
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