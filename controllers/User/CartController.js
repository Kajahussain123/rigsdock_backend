const Cart = require("../../models/User/CartModel");
const Product = require("../../models/admin/ProductModel");
const Coupon = require('../../models/admin/couponModel')
const Order = require('../../models/User/OrderModel')
const PlatformFee = require("../../models/admin/PlatformFeeModel"); 

// Add product to cart
exports.addToCart = async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Find or create a cart
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [], totalPrice: 0, platformFee: 0 });
        }

        // Check if product already exists in cart
        const existingItem = cart.items.find(item => item.product.toString() === productId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({
                product: productId,
                quantity,
                price: product.finalPrice || product.price, // Use finalPrice if available
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
        res.status(200).json({ message: "Product added to cart", cart });
    } catch (error) {
        res.status(500).json({ message: "Error adding product to cart", error: error.message });
    }
};


// Get user's cart
exports.getCart = async (req, res) => {
    try {
        const { userId } = req.params;
        const cart = await Cart.findOne({ user: userId }).populate("items.product");

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Fetch platform fee from database if not stored in cart
        if (!cart.platformFee || cart.platformFee === 0) {
            const feeConfig = await PlatformFee.findOne();
            let platformFee = 0;

            if (feeConfig) {
                platformFee = feeConfig.feeType === "fixed" 
                    ? feeConfig.amount 
                    : (feeConfig.amount / 100) * cart.totalPrice;
            }

            cart.platformFee = platformFee;
            await cart.save(); // Save the updated cart with platform fee
        }

        res.status(200).json({
            cart,
            platformFee: cart.platformFee,  // Ensure the correct platform fee is returned
            totalPrice: cart.totalPrice,
            appliedCoupon: cart.coupon || null
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching cart", error: error.message });
    }
};



// Remove product from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { userId, productId } = req.body;
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);

        // Update total price
        cart.totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        await cart.save();
        res.status(200).json({ message: "Product removed from cart", cart });
    } catch (error) {
        res.status(500).json({ message: "Error removing product from cart", error: error.message });
    }
};

// Clear cart
exports.clearCart = async (req, res) => {
    try {
        const { userId } = req.params;
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        cart.items = [];
        cart.totalPrice = 0;
        await cart.save();

        res.status(200).json({ message: "Cart cleared successfully", cart });
    } catch (error) {
        res.status(500).json({ message: "Error clearing cart", error: error.message });
    }
};


//apply coupon 
exports.applyCoupon = async (req, res) => {
    try {
        const { userId, couponCode } = req.body;

        // Find the user's cart
        let cart = await Cart.findOne({ user: userId }).populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        // Find the coupon
        const coupon = await Coupon.findOne({ couponCode });
        if (!coupon) {
            return res.status(400).json({ message: "Invalid coupon code" });
        }

        // Check if the coupon is still valid
        const currentDate = new Date();
        if (currentDate < new Date(coupon.validFrom) || currentDate > new Date(coupon.validTo)) {
            return res.status(400).json({ message: "Coupon is not valid at this time" });
        }

        // Check first purchase requirement
        if (coupon.firstPurchaseOnly) {
            const existingOrder = await Order.findOne({ user: userId });
            if (existingOrder) {
                return res.status(400).json({ message: "This coupon is only valid for first-time purchases" });
            }
        }

        // Validate minimum purchase amount
        if (cart.totalPrice < coupon.minPurchaseAmount) {
            return res.status(400).json({ message: `Minimum purchase amount required: ${coupon.minPurchaseAmount}` });
        }

        let discountAmount = 0;
        let isValidCoupon = false;

        // Apply coupon based on its ownerType and targetType
        if (coupon.ownerType === "Vendor") {
            // Vendor coupons apply only to products they own
            cart.items.forEach((item) => {
                if (
                    coupon.targetType === "Product" &&
                    item.product._id.toString() === coupon.target.toString() &&
                    item.product.owner.toString() === coupon.ownerId.toString()
                ) {
                    isValidCoupon = true;
                    const discount = coupon.discountType === "percentage"
                        ? (item.price * coupon.discountValue) / 100
                        : coupon.discountValue;
                    discountAmount += Math.min(discount, item.price * item.quantity);
                }
            });

        } else if (coupon.ownerType === "Admin") {
            // Admin coupons apply to products, categories, or subcategories
            cart.items.forEach((item) => {
                if (
                    (coupon.targetType === "Product" && item.product._id.toString() === coupon.target.toString()) ||
                    (coupon.targetType === "Category" && item.product.category.toString() === coupon.target.toString()) ||
                    (coupon.targetType === "SubCategory" && item.product.subcategory.toString() === coupon.target.toString())
                ) {
                    isValidCoupon = true;
                    const discount = coupon.discountType === "percentage"
                        ? (item.price * coupon.discountValue) / 100
                        : coupon.discountValue;
                    discountAmount += Math.min(discount, item.price * item.quantity);
                }
            });
        }

        if (!isValidCoupon) {
            return res.status(400).json({ message: "Coupon does not apply to any items in your cart" });
        }

        // Ensure discount does not exceed total price
        discountAmount = Math.min(discountAmount, cart.totalPrice);
        cart.totalPrice -= discountAmount;

        // Store applied coupon details
        cart.coupon = { code: couponCode, discountAmount, ownerType: coupon.ownerType, ownerId: coupon.ownerId };
        await cart.save();

        res.status(200).json({
            message: "Coupon applied successfully",
            discountAmount,
            newTotalPrice: cart.totalPrice,
            cart,
        });

    } catch (error) {
        res.status(500).json({ message: "Error applying coupon", error: error.message });
    }
};


// remove coupon 
exports.removeCoupon = async (req, res) => {
    try {
        const { userId } = req.body;

        // Find cart for the user
        let cart = await Cart.findOne({ user: userId });
        if (!cart || !cart.coupon) {
            return res.status(400).json({ message: "No coupon applied to this cart" });
        }

        // Remove discount and coupon
        cart.totalPrice += cart.coupon.discountAmount;
        cart.coupon = null;

        await cart.save();
        res.status(200).json({ message: "Coupon removed successfully", cart });
    } catch (error) {
        res.status(500).json({ message: "Error removing coupon", error: error.message });
    }
};

