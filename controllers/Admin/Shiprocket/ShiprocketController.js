const User = require('../../../models/User/AuthModel');
const MainOrder = require('../../../models/User/MainOrderModel');
const Order = require('../../../models/User/OrderModel');
const Vendor = require('../../../models/Vendor/vendorModel');

// Route for admin to track all orders
async function getAllOrders() {
  try {
    const mainOrders = await MainOrder.find();
    
    const allOrdersWithTracking = [];
    
    for (const mainOrder of mainOrders) {
      const subOrders = await Order.find({ 
        _id: { $in: mainOrder.subOrders } 
      });
      
      const subOrdersWithTracking = [];
      
      for (const subOrder of subOrders) {
        // Get vendor details
        const vendor = await Vendor.findById(subOrder.vendor);
        
        if (subOrder.shiprocketOrderId) {
          const trackingInfo = await trackShipment(subOrder.shiprocketOrderId);
          subOrdersWithTracking.push({
            order: subOrder,
            vendor,
            tracking: trackingInfo
          });
        } else {
          subOrdersWithTracking.push({
            order: subOrder,
            vendor,
            tracking: null
          });
        }
      }
      
      // Get user details
      const user = await User.findById(mainOrder.user);
      
      allOrdersWithTracking.push({
        mainOrder,
        user,
        subOrders: subOrdersWithTracking
      });
    }
    
    return allOrdersWithTracking;
  } catch (error) {
    console.error('Error getting all orders:', error);
    throw error;
  }
}