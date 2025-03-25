const Order = require('../../../models/User/OrderModel');

// 8. API Routes for tracking (to be used in your Express app)
// Route for vendors to track their orders
async function getVendorOrders(vendorId) {
  try {
    const subOrders = await Order.find({ vendor: vendorId });
    
    const ordersWithTracking = [];
    
    for (const order of subOrders) {
      if (order.shiprocketOrderId) {
        const trackingInfo = await trackShipment(order.shiprocketOrderId);
        ordersWithTracking.push({
          order,
          tracking: trackingInfo
        });
      } else {
        ordersWithTracking.push({
          order,
          tracking: null
        });
      }
    }
    
    return ordersWithTracking;
  } catch (error) {
    console.error('Error getting vendor orders:', error);
    throw error;
  }
}