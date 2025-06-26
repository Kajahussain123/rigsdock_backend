const Cart = require("../../models/User/CartModel");
const Product = require("../../models/admin/ProductModel");
const Order = require("../../models/User/OrderModel");
const User = require("../../models/User/AuthModel");
const Coupon = require("../../models/admin/couponModel");
const PlatformFee = require("../../models/admin/PlatformFeeModel");

// Create order from cart
exports.createOrder = async (req, res) => {
    try {
        const { 
            userId, 
            shippingAddress, 
            paymentMethod, 
            couponCode,
            orderNotes 
        } = req.body;

        // Validate user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Get user's cart
        const cart = await Cart.findOne({ user: userId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        // Validate stock availability
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            if (!product) {
                return res.status(404).json({ 
                    message: `Product ${item.product.name} not found` 
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
                });
            }

            if (!product.isActive) {
                return res.status(400).json({ 
                    message: `Product ${product.name} is no longer available` 
                });
            }
        }

        // Calculate totals
        let subtotal = 0;
        const orderItems = cart.items.map(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            return {
                product: item.product._id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.price,
                total: itemTotal
            };
        });

        // Apply coupon if provided
        let couponDiscount = 0;
        let appliedCoupon = null;
        
        if (couponCode) {
            const coupon = await Coupon.findOne({ 
                code: couponCode.toUpperCase(),
                isActive: true,
                validFrom: { $lte: new Date() },
                validTo: { $gte: new Date() }
            });

            if (!coupon) {
                return res.status(400).json({ message: "Invalid or expired coupon" });
            }

            // Check if user has already used this coupon
            const existingOrder = await Order.findOne({
                user: userId,
                'coupon.code': coupon.code
            });

            if (existingOrder && coupon.usageLimit === 1) {
                return res.status(400).json({ message: "Coupon already used" });
            }

            // Check minimum order amount
            if (subtotal < coupon.minOrderAmount) {
                return res.status(400).json({ 
                    message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon` 
                });
            }

            // Calculate discount
            if (coupon.discountType === 'percentage') {
                couponDiscount = Math.min(
                    (subtotal * coupon.discountValue) / 100,
                    coupon.maxDiscountAmount || subtotal
                );
            } else {
                couponDiscount = Math.min(coupon.discountValue, subtotal);
            }

            appliedCoupon = {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discountAmount: couponDiscount
            };
        }

        // Calculate platform fee
        const feeConfig = await PlatformFee.findOne();
        let platformFee = 0;
        if (feeConfig) {
            const baseAmount = subtotal - couponDiscount;
            platformFee = feeConfig.feeType === "fixed"
                ? feeConfig.amount
                : (feeConfig.amount / 100) * baseAmount;
        }

        // Calculate final total
        const totalAmount = subtotal - couponDiscount + platformFee;

        // Generate order number
        const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Create order
        const order = new Order({
            orderNumber,
            user: userId,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            coupon: appliedCoupon,
            platformFee,
            totalAmount,
            orderStatus: 'pending',
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
            orderNotes: orderNotes || '',
            orderDate: new Date()
        });

        await order.save();

        // Update product stock
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(
                item.product._id,
                { $inc: { stock: -item.quantity } }
            );
        }

        // Update coupon usage if applied
        if (appliedCoupon) {
            await Coupon.findOneAndUpdate(
                { code: appliedCoupon.code },
                { $inc: { usedCount: 1 } }
            );
        }

        // Clear user's cart
        await Cart.findOneAndUpdate(
            { user: userId },
            { 
                items: [], 
                totalPrice: 0, 
                platformFee: 0,
                coupon: null 
            }
        );

        res.status(201).json({
            message: "Order created successfully",
            order: {
                orderNumber: order.orderNumber,
                orderId: order._id,
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus
            }
        });

    } catch (error) {
        res.status(500).json({ 
            message: "Error creating order", 
            error: error.message 
        });
    }
};

// Buy now (add to cart temporarily then proceed to checkout)
exports.buyNow = async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;

        // Validate user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Validate product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (!product.isActive) {
            return res.status(400).json({ message: "Product is not available" });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ 
                message: `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}` 
            });
        }

        // Clear existing cart and add this product
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [], totalPrice: 0, platformFee: 0 });
        }

        // Clear existing items for buy now
        cart.items = [];

        // Add the product to cart
        const price = product.finalPrice || product.price;
        cart.items.push({
            product: productId,
            quantity,
            price: price
        });

        // Recalculate total price
        cart.totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // Fetch platform fee config
        const feeConfig = await PlatformFee.findOne();
        let platformFee = 0;
        if (feeConfig) {
            platformFee = feeConfig.feeType === "fixed"
                ? feeConfig.amount
                : (feeConfig.amount / 100) * cart.totalPrice;
        }

        cart.platformFee = platformFee;
        cart.totalPrice += platformFee;

        await cart.save();

        // Return cart data for checkout
        const populatedCart = await Cart.findOne({ user: userId }).populate("items.product");

        res.status(200).json({
            message: "Product added to cart for buy now. Proceed to checkout.",
            cart: populatedCart,
            buyNow: true // Flag to indicate this is a buy now flow
        });

    } catch (error) {
        res.status(500).json({ 
            message: "Error processing buy now", 
            error: error.message 
        });
    }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate('user', 'name email phone')
            .populate('items.product', 'name images category brand');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json({
            message: "Order details fetched successfully",
            order
        });

    } catch (error) {
        res.status(500).json({ 
            message: "Error fetching order details", 
            error: error.message 
        });
    }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentStatus, transactionId, paymentMethod } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Update payment details
        order.paymentStatus = paymentStatus;
        if (transactionId) {
            order.transactionId = transactionId;
        }
        if (paymentMethod) {
            order.paymentMethod = paymentMethod;
        }

        // If payment is successful, update order status
        if (paymentStatus === 'paid' || paymentStatus === 'completed') {
            order.orderStatus = 'confirmed';
            order.paymentDate = new Date();
        } else if (paymentStatus === 'failed') {
            // Restore product stock if payment failed
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: item.quantity } }
                );
            }
            order.orderStatus = 'cancelled';
        }

        await order.save();

        res.status(200).json({
            message: "Payment status updated successfully",
            order: {
                orderNumber: order.orderNumber,
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus
            }
        });

    } catch (error) {
        res.status(500).json({ 
            message: "Error updating payment status", 
            error: error.message 
        });
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if order can be cancelled
        if (!['pending', 'confirmed'].includes(order.orderStatus)) {
            return res.status(400).json({ 
                message: "Order cannot be cancelled at this stage" 
            });
        }

        // Restore product stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } }
            );
        }

        // Update order status
        order.orderStatus = 'cancelled';
        order.cancellationReason = reason || 'Cancelled by user';
        order.cancellationDate = new Date();

        await order.save();

        res.status(200).json({
            message: "Order cancelled successfully",
            orderNumber: order.orderNumber
        });

    } catch (error) {
        res.status(500).json({ 
            message: "Error cancelling order", 
            error: error.message 
        });
    }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        const query = { user: userId };
        if (status) {
            query.orderStatus = status;
        }

        const orders = await Order.find(query)
            .populate('items.product', 'name images')
            .sort({ orderDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Order.countDocuments(query);

        res.status(200).json({
            message: "Orders fetched successfully",
            orders,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });

    } catch (error) {
        res.status(500).json({ 
            message: "Error fetching user orders", 
            error: error.message 
        });
    }
};

// Validate coupon
exports.validateCoupon = async (req, res) => {
    try {
        const { couponCode, userId, subtotal } = req.body;

        const coupon = await Coupon.findOne({ 
            code: couponCode.toUpperCase(),
            isActive: true,
            validFrom: { $lte: new Date() },
            validTo: { $gte: new Date() }
        });

        if (!coupon) {
            return res.status(400).json({ 
                valid: false, 
                message: "Invalid or expired coupon" 
            });
        }

        // Check if user has already used this coupon
        const existingOrder = await Order.findOne({
            user: userId,
            'coupon.code': coupon.code
        });

        if (existingOrder && coupon.usageLimit === 1) {
            return res.status(400).json({ 
                valid: false, 
                message: "Coupon already used" 
            });
        }

        // Check minimum order amount
        if (subtotal < coupon.minOrderAmount) {
            return res.status(400).json({ 
                valid: false, 
                message: `Minimum order amount of ₹${coupon.minOrderAmount} required` 
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = Math.min(
                (subtotal * coupon.discountValue) / 100,
                coupon.maxDiscountAmount || subtotal
            );
        } else {
            discountAmount = Math.min(coupon.discountValue, subtotal);
        }

        res.status(200).json({
            valid: true,
            message: "Coupon is valid",
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discountAmount: Math.round(discountAmount * 100) / 100
            }
        });

    } catch (error) {
        res.status(500).json({ 
            message: "Error validating coupon", 
            error: error.message 
        });
    }
};