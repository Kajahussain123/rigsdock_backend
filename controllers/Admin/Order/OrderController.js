const Order = require('../../../models/User/OrderModel');

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