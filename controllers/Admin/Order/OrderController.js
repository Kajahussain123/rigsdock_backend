const Order = require('../../../models/User/OrderModel');
const PlatformFee = require('../../../models/admin/PlatformFeeModel');
const { trackShipment } = require('../../../controllers/Shiprocket/ShipRocketController');


exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('user').populate({
            path: 'items.product',
            populate: [
                { path: 'owner', model: 'Vendor' },
                { path: 'category', model: 'Category' } // populate category
            ]
        });
        
        if (orders.length === 0) {
            return res.status(404).json({ message: "no orders found" });
        }

        const platformFeeData = await PlatformFee.findOne() .sort({ createdAt: -1 }) .sort({ createdAt: -1 });
        const platformFee = platformFeeData?.amount || 0;

        
        const ordersWithCalculations = orders.map(order => {
            
            const itemsWithCommission = order.items.map(item => {
                const product = item.product;
                // Default commission percentage to 0 if category is missing
                const commissionPercentage = product?.category?.commissionPercentage || 0;
                const itemPrice = item.price; // Final price paid by customer
                const commissionAmount = (itemPrice * commissionPercentage) / 100;
                const vendorAmount = itemPrice - commissionAmount;

                return {
                    ...item.toObject(),
                    commissionPercentage,
                    commissionAmount,
                    vendorAmount
                };
            });

            // Calculate totals for the entire order
            const totalCommission = itemsWithCommission.reduce((sum, item) => sum + item.commissionAmount, 0);
            const totalVendorAmount = itemsWithCommission.reduce((sum, item) => sum + item.vendorAmount, 0);
            const finalTotal = order.totalPrice + platformFee;

            return {
                ...order.toObject(),
                platformFee,
                finalTotalPrice: finalTotal,
                items: itemsWithCommission,
                totalCommission,
                totalVendorAmount
            };
        });

        res.status(200).json({ 
            message: "orders fetched successfully",
            total: orders.length,
            orders: ordersWithCalculations
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
};

// PUT /api/orders/:orderId/settlement
exports.updateOrderSettlement = async (req, res) => {
    const { orderId } = req.params;
    const { settled } = req.body;
  
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      order.settled = settled;
      await order.save();
  
      res.status(200).json({ message: `Order marked as ${settled ? 'settled' : 'not settled'}`, order });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update settlement status', error: error.message });
    }
  };
  

// update orderstatus
exports.updateOrderStatus = async(req,res) => {
    try {
        const { orderStatus } = req.body;
        const { orderId } = req.params;
        if (!orderStatus) {
            return res.status(400).json({ message: "orderStatus is required" });
        }
        const updatedOrder = await Order.findByIdAndUpdate(orderId,{orderStatus},{ new: true });
        if(!updatedOrder){
            return res.status(404).json({ message: "order status not updated" });
        }
        res.status(200).json({ message: "order status updated", updatedOrder });
    } catch (error) {
        res.status(500).json({ message: 'Error updating order status', error:error.message })
    }
}

// get order by id
exports.getOrderById = async(req,res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('user shippingAddress').populate({
            path: 'items.product',
            populate: {
              path: 'owner',
              model: 'Vendor'
            }
          })
        if(!order) {
            return res.status(404).json({ message: "order not found" });
        }
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error fetch order', error:error.message })
    }
}

exports.trackOrder = async(req,res) => {
    try {
        const { orderId } = req.params;

        // Fetch the order from the database
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        console.log("tracker order",order)

        // Fetch Shiprocket tracking details
        const trackingInfo = await trackShipment(order.shiprocketOrderId);

        res.status(200).json({
            message: 'Order status fetched successfully',
            orderStatus: order.orderStatus,
            trackingInfo,
        });
    } catch (error) {
        console.error('Error tracking order:', error);
        res.status(500).json({ message: 'Error tracking order', error: error.message });
    }
}