const express = require('express');
const router = express.Router();
const buyController = require('../../controllers/User/Buycontroller');

// Create order from cart
router.post('/create-order', buyController.createOrder);

// Buy now (direct purchase)
router.post('/', buyController.buyNow);

// Get order details
router.get('/order/:orderId', buyController.getOrderDetails);

// Update payment status
router.put('/payment-status/:orderId', buyController.updatePaymentStatus);

// Cancel order
router.put('/cancel-order/:orderId', buyController.cancelOrder);

// Get user orders
router.get('/user-orders/:userId', buyController.getUserOrders);

// Validate coupon
router.post('/validate-coupon', buyController.validateCoupon);

module.exports = router;