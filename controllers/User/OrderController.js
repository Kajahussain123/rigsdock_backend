const Order = require("../../models/User/OrderModel");
const Cart = require("../../models/User/CartModel");
const Address = require("../../models/User/AddressModel");
const Coupon = require("../../models/admin/couponModel");

// Place an order (POST method)
exports.placeOrder = async (req, res) => {
    try {
        const { userId, shippingAddressId, paymentMethod } = req.body;

        // Fetch user's cart (including applied coupon)
        const cart = await Cart.findOne({ user: userId }).populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        // Validate shipping address
        const shippingAddress = await Address.findById(shippingAddressId);
        if (!shippingAddress) {
            return res.status(400).json({ message: "Invalid shipping address" });
        }

        // Validate payment method
        const validPaymentMethods = ["COD", "Credit Card", "Debit Card", "UPI", "Net Banking"];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ message: "Invalid payment method" });
        }

        // Use cart totalPrice directly without subtracting discountAmount again
        let finalPrice = cart.totalPrice;  

        // Create order
        const newOrder = new Order({
            user: userId,
            items: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.price,
            })),
            totalPrice: finalPrice, // Use cart.totalPrice as final price
            coupon: cart.coupon ? { code: cart.coupon.code, discountAmount: cart.coupon.discountAmount } : undefined,
            paymentMethod,
            paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid", // COD remains Pending, others Paid
            orderStatus: "Processing",
            shippingAddress: shippingAddressId,
        });

        await newOrder.save();

        // Clear cart after order placement
        await Cart.findOneAndUpdate({ user: userId }, { items: [], totalPrice: 0, coupon: null });

        res.status(201).json({ message: "Order placed successfully", order: newOrder });
    } catch (error) {
        res.status(500).json({ message: "Error placing order", error: error.message });
    }
};



// Get all orders for a user (GET method)
exports.getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;

        const orders = await Order.find({ user: userId })
            .populate("items.product")
            .populate("shippingAddress")
            .sort({ createdAt: -1 });

        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders", error: error.message });
    }
};

// Get a single order by ID (GET method)
exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate("items.product")
            .populate("shippingAddress")
            .populate("user");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json({ order });
    } catch (error) {
        res.status(500).json({ message: "Error fetching order", error: error.message });
    }
};

// Update order status (PATCH method)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { orderStatus, paymentStatus } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { orderStatus, paymentStatus },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json({ message: "Order updated successfully", order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: "Error updating order", error: error.message });
    }
};
