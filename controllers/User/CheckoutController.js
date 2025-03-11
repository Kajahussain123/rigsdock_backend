const Cart = require("../../models/User/CartModel");

// Get checkout details (GET method)
exports.getCheckoutDetails = async (req, res) => {
    try {
        const { userId } = req.params;

        const cart = await Cart.findOne({ user: userId }).populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        // Extract coupon details if available
        const appliedCoupon = cart.coupon
            ? {
                code: cart.coupon.code,
                discountAmount: cart.coupon.discountAmount,
            }
            : null;

        res.status(200).json({
            items: cart.items,
            totalPrice: cart.totalPrice, // Original total price before discount
            appliedCoupon, // Coupon details if available
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching checkout details", error: error.message });
    }
};


// Proceed to checkout (POST method)
exports.proceedToCheckout = async (req, res) => {
    try {
        const { userId } = req.body;

        const cart = await Cart.findOne({ user: userId }).populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        res.status(200).json({ message: "Checkout data ready", items: cart.items, totalPrice: cart.totalPrice });
    } catch (error) {
        res.status(500).json({ message: "Error during checkout", error: error.message });
    }
};
