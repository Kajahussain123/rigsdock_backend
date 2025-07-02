const Cart = require("../../models/User/CartModel");
const Product = require("../../models/admin/ProductModel");
const User = require("../../models/User/AuthModel");
const PlatformFee = require("../../models/admin/PlatformFeeModel");



// Buy now (add to cart temporarily then proceed to checkout)
exports.buyNow = async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;

        // Validate input
        if (!userId || !productId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: "Invalid input parameters" });
        }

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

        // Get the correct price
        const price = product.finalPrice || product.price;

        // OPTION 1: Clear cart and add only this product (true "Buy Now" behavior)
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [], totalPrice: 0, platformFee: 0 });
        }

        // Clear existing items for true "Buy Now" behavior
        cart.items = [];
        
        // Add the new product
        cart.items.push({
            product: productId,
            quantity: parseInt(quantity), // Ensure it's a number
            price: price
        });

        // Calculate subtotal
        const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Calculate platform fee
        const feeConfig = await PlatformFee.findOne();
        let platformFee = 0;
        if (feeConfig) {
            if (feeConfig.feeType === "fixed") {
                platformFee = feeConfig.amount;
            } else if (feeConfig.feeType === "percentage") {
                platformFee = (feeConfig.amount / 100) * subtotal;
            }
        }

        // Update cart
        cart.platformFee = platformFee;
        cart.totalPrice = subtotal + platformFee;

        await cart.save();

        // Return populated cart data
        const populatedCart = await Cart.findOne({ user: userId }).populate("items.product");

        res.status(200).json({
            message: "Product added to cart. Proceed to checkout.",
            cart: {
                ...populatedCart.toObject(),
                subtotal: subtotal,
                platformFee: platformFee,
                totalPrice: cart.totalPrice
            },
            buyNow: true
        });

    } catch (error) {
        console.error("Buy now error:", error);
        res.status(500).json({
            message: "Error processing buy now",
            error: error.message
        });
    }
};

