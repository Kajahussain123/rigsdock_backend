const Cart = require("../../models/User/CartModel");
const Product = require("../../models/admin/ProductModel");
const Order = require("../../models/User/OrderModel");
const User = require("../../models/User/AuthModel");
const Coupon = require("../../models/admin/couponModel");
const PlatformFee = require("../../models/admin/PlatformFeeModel");



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
    console.warn(`Product ${productId} is inactive but being purchased`);
}

        if (product.stock < quantity) {
            return res.status(400).json({ 
                message: `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}` 
            });
        }

        // Find or create cart (without clearing existing items)
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [], totalPrice: 0, platformFee: 0 });
        }

        // Check if the product already exists in the cart
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (existingItemIndex >= 0) {
            // Update quantity if product already exists
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new product to cart
            const price = product.finalPrice || product.price;
            cart.items.push({
                product: productId,
                quantity,
                price: price
            });
        }

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

        // Return populated cart data
        const populatedCart = await Cart.findOne({ user: userId }).populate("items.product");

        res.status(200).json({
            message: "Product added to cart. Proceed to checkout.",
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

