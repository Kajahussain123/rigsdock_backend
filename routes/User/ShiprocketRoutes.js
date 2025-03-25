const express = require('express');
const router = express.Router();
const shipRocketController = require('../../controllers/User/ShiprocketController');

// Route for users to track their orders
router.get('/get-orders/:userId',shipRocketController.getUserOrders);

// cancel orders
router.patch('/orders/:orderId/cancel',shipRocketController.cancelOrder);

module.exports = router;