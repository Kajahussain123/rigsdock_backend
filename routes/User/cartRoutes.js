const express = require("express");
const router = express.Router();
const cartController = require("../../controllers/User/CartController");

// Add product to cart
router.post("/add", cartController.addToCart);

// Get user's cart
router.get("/:userId", cartController.getCart);

// Get user's cart count
router.get("/count/:userId", cartController.getCartCount);

// Apply coupon
router.post("/apply-coupon", cartController.applyCoupon);

// Remove coupon
router.post("/remove-coupon", cartController.removeCoupon);

// Remove product from cart
router.post("/remove", cartController.removeFromCart);

// Clear cart
router.delete("/clear/:userId", cartController.clearCart);

router.post("/update-quantity", cartController.updateCartQuantity);

module.exports = router;
