const Order = require('../../../models/User/OrderModel');
const PlatformFee = require('../../../models/admin/PlatformFeeModel');
const { trackShipment } = require('../../../controllers/Shiprocket/ShipRocketController');
const Complaint = require('../../../models/User/ComplaintModel');
const MainOrder = require('../../../models/User/MainOrderModel');


exports.getAllOrders = async (req, res) => {
    try {
        // First get all main orders to access coupon information
        const mainOrders = await MainOrder.find()
            .sort({ createdAt: -1 })
            .populate('user')
            .populate('shippingAddress');

        if (mainOrders.length === 0) {
            return res.status(404).json({ message: "No orders found" });
        }

        // Get all sub-orders with proper population
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('user')
            .populate('vendor')
            .populate({
                path: 'items.product',
                populate: [
                    { path: 'owner', model: 'Vendor' },
                    { path: 'category', model: 'Category' }
                ]
            });

        const platformFeeData = await PlatformFee.findOne().sort({ createdAt: -1 });
        const platformFee = platformFeeData?.amount || 0;

        // Create a map of mainOrderId to coupon information
        const couponInfoMap = {};
        mainOrders.forEach(mainOrder => {
            couponInfoMap[mainOrder._id] = {
                couponDiscount: mainOrder.couponDiscount || 0,
                couponCode: mainOrder.couponCode || null,
                subtotal: mainOrder.subtotal,
                platformFee: mainOrder.platformFee,
                totalAmount: mainOrder.totalAmount
            };
        });

        const ordersWithCalculations = orders.map(order => {
            const mainOrderInfo = couponInfoMap[order.mainOrderId] || {};
            const couponDiscount = mainOrderInfo.couponDiscount || 0;
            const couponCode = mainOrderInfo.couponCode || null;
            const mainOrderSubtotal = mainOrderInfo.subtotal || 0;
            const platformFee = mainOrderInfo.platformFee || 0;

            // Calculate the discount proportion for this order
            const orderDiscountProportion = order.totalPrice / mainOrderSubtotal;
            const orderDiscountAmount = couponDiscount * orderDiscountProportion;

            const itemsWithCommission = order.items.map(item => {
                const product = item.product;
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
            
            // Calculate final total with platform fee proportion
            const orderPlatformFeeProportion = platformFee * orderDiscountProportion;
            const finalTotal = (order.totalPrice - orderDiscountAmount) + orderPlatformFeeProportion;

            return {
                ...order.toObject(),
                couponDiscount: orderDiscountAmount,
                couponCode,
                platformFee: orderPlatformFeeProportion,
                originalOrderTotal: order.totalPrice,
                discountedOrderTotal: order.totalPrice - orderDiscountAmount,
                finalTotalPrice: finalTotal,
                items: itemsWithCommission,
                totalCommission,
                totalVendorAmount,
                mainOrderInfo: {
                    mainOrderId: order.mainOrderId,
                    mainOrderSubtotal,
                    mainOrderCouponDiscount: couponDiscount,
                    mainOrderPlatformFee: platformFee,
                    mainOrderTotal: mainOrderInfo.totalAmount
                }
            };
        });

        res.status(200).json({ 
            message: "Orders fetched successfully",
            total: orders.length,
            orders: ordersWithCalculations
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching orders', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Get the order with populated data
        const order = await Order.findById(orderId)
            .populate('user shippingAddress vendor')
            .populate({
                path: 'items.product',
                populate: [
                    { path: 'owner', model: 'Vendor' },
                    { path: 'category', model: 'Category' }
                ]
            });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Get the main order to access coupon information
        const mainOrder = await MainOrder.findById(order.mainOrderId);
        if (!mainOrder) {
            return res.status(404).json({ message: "Main order not found" });
        }

        // Get complaints for this order
        const complaints = await Complaint.find({ order: orderId });

        // Calculate the discount proportion for this order
        const orderDiscountProportion = order.totalPrice / mainOrder.subtotal;
        const orderDiscountAmount = mainOrder.couponDiscount * orderDiscountProportion;
        const orderPlatformFee = mainOrder.platformFee * orderDiscountProportion;

        // Attach complaints to their matching product in items
        const itemsWithDetails = order.items.map(item => {
            const itemComplaints = complaints.filter(
                complaint => complaint.product.toString() === item.product._id.toString()
            );

            const product = item.product;
            const commissionPercentage = product?.category?.commissionPercentage || 0;
            const itemPrice = item.price;
            const commissionAmount = (itemPrice * commissionPercentage) / 100;
            const vendorAmount = itemPrice - commissionAmount;

            return {
                ...item.toObject(),
                complaints: itemComplaints,
                commissionPercentage,
                commissionAmount,
                vendorAmount
            };
        });

        // Calculate totals for the entire order
        const totalCommission = itemsWithDetails.reduce((sum, item) => sum + item.commissionAmount, 0);
        const totalVendorAmount = itemsWithDetails.reduce((sum, item) => sum + item.vendorAmount, 0);

        const orderWithDetails = {
            ...order.toObject(),
            couponDiscount: orderDiscountAmount,
            couponCode: mainOrder.couponCode,
            platformFee: orderPlatformFee,
            originalOrderTotal: order.totalPrice,
            discountedOrderTotal: order.totalPrice - orderDiscountAmount,
            finalTotalPrice: (order.totalPrice - orderDiscountAmount) + orderPlatformFee,
            items: itemsWithDetails,
            totalCommission,
            totalVendorAmount,
            mainOrderInfo: {
                mainOrderId: mainOrder._id,
                mainOrderSubtotal: mainOrder.subtotal,
                mainOrderCouponDiscount: mainOrder.couponDiscount,
                mainOrderPlatformFee: mainOrder.platformFee,
                mainOrderTotal: mainOrder.totalAmount
            }
        };

        res.status(200).json({ 
            message: "Order fetched successfully",
            order: orderWithDetails
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error fetching order", 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};


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