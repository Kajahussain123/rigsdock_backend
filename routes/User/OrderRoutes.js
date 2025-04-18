const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/User/OrderController");

// Place a new order
router.post("/place-order", orderController.placeOrder);

// Get all orders for a user
router.get("/user/:userId", orderController.getUserOrders);

// Get order by ID
router.get("/:orderId", orderController.getOrderById);

// Update order status
router.patch("/:orderId", orderController.updateOrderStatus);

router.get("/:mainOrderId/invoice", orderController.generateInvoiceForMainOrder); 

router.post('/phonepe-webhook', orderController.phonepeWebhook);

router.get("/main/:mainOrderId", orderController.getOrdersByMainOrderId);

// Check payment status
router.get('/payment-status/:orderId', orderController.checkPaymentStatus);


module.exports = router;
