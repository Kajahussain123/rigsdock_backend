const Order = require("../../models/User/OrderModel");
const Cart = require("../../models/User/CartModel");
const Address = require("../../models/User/AddressModel");
const MainOrder = require("../../models/User/MainOrderModel");
const { createShiprocketOrder } = require('../../controllers/Shiprocket/ShipRocketController')
// Place an order (POST method)
exports.placeOrder = async (req, res) => {
    try {
        const { userId, shippingAddressId, paymentMethod } = req.body;

        // Fetch user's cart with product details
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

        // Group items by vendor (using owner field)
        const vendorOrders = {};
        let totalAmount = 0;

        cart.items.forEach(item => {
            const vendorId = item.product.owner ? item.product.owner.toString() : null;
            if (!vendorId) {
                console.error("Error: Product missing owner field", item.product);
                return; // Skip products without an owner
            }

            if (!vendorOrders[vendorId]) {
                vendorOrders[vendorId] = {
                    vendor: vendorId,
                    items: [],
                    totalPrice: 0,
                };
            }
            vendorOrders[vendorId].items.push({
                product: item.product._id,
                quantity: item.quantity,
                price: item.price,
            });
            vendorOrders[vendorId].totalPrice += item.price * item.quantity;
            totalAmount += item.price * item.quantity;
        });

        // Create Main Order
        const mainOrder = new MainOrder({
            user: userId,
            totalAmount,
            paymentMethod,
            paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
            orderStatus: "Processing",
            shippingAddress: shippingAddressId,
            subOrders: [], // Will be updated later
        });

        await mainOrder.save();

        // Create vendor orders and link to main order
        const createdOrders = [];
        for (const vendorId in vendorOrders) {
            const orderData = vendorOrders[vendorId];

            const newOrder = new Order({
                mainOrderId: mainOrder._id, // Link to Main Order
                user: userId,
                vendor: vendorId,
                items: orderData.items,
                totalPrice: orderData.totalPrice,
                paymentMethod,
                paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
                orderStatus: "Processing",
                shippingAddress: shippingAddressId,
            });

            await newOrder.save();
            createdOrders.push(newOrder._id);
        }

        // Update Main Order with subOrders
        mainOrder.subOrders = createdOrders;
        await mainOrder.save();

        // Clear the cart after placing the order
        await Cart.findOneAndUpdate({ user: userId }, { items: [], totalPrice: 0, coupon: null });

        // Step 2: Create Shiprocket shipments for each sub-order
        const shiprocketResponses = [];
        for (const subOrderId of createdOrders) {
            const subOrder = await Order.findById(subOrderId).populate('items.product');

            // Create Shiprocket order for each subOrder
            const response = await createShiprocketOrder(subOrder, mainOrder, shippingAddress,userId);

            // Save Shiprocket IDs to the subOrder
            subOrder.shiprocketOrderId = response.order_id;
            subOrder.shiprocketShipmentId = response.shipment_id;
            await subOrder.save();
            console.log("subOrder",subOrder);

            shiprocketResponses.push(response);
        }

        res.status(201).json({
            message: "Orders placed and Shiprocket shipments created successfully",
            mainOrderId: mainOrder._id,
            orders: createdOrders,
            shiprocketResponses,
        });
    } catch (error) {
        console.error("Error placing order:", error);
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
