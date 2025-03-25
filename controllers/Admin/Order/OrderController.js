const Order = require('../../../models/User/OrderModel');
const { trackShipment } = require('../../../controllers/Shiprocket/ShipRocketController');

// get all orders
exports.getAllOrders = async (req,res) => {
    try {
        const orders = await Order.find().populate('user');
        if(orders.length === 0) {
            return res.status(404).json({ message: "no orders found" });
        }
        res.status(200).json({ message: "orders fetched successfully",total: orders.length ,orders });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error:error.message })
    }
}

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
        const order = await Order.findById(orderId).populate('user shippingAddress').populate("items.product", "name");;
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