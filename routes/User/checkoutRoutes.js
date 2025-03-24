const express = require("express");
const { getCheckoutDetails, proceedToCheckout } = require("../../controllers/User/CheckoutController");
const router = express.Router();

router.get("/view/:userId", getCheckoutDetails); // Fetch cart details for checkout
router.post("/create", proceedToCheckout); // Proceed to checkout

module.exports = router;
