const express = require("express");
const router = express.Router();
const cartController = require("../../controllers/User/CartController");

// Add product to cart
router.post("/add", cartController.addToCart);

// Get user's cart
router.get("/:userId", cartController.getCart);

// Remove product from cart
router.post("/remove", cartController.removeFromCart);

// Clear cart
router.delete("/clear/:userId", cartController.clearCart);

module.exports = router;
