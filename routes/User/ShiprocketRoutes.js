const express = require('express');
const router = express.Router();
const shipRocketController = require('../../controllers/User/ShiprocketController');

// Route for users to get their orders details
router.get('/get-orders',shipRocketController.getOrderDetailsById);

// cancel orders
router.patch('/orders/:orderId/cancel',shipRocketController.cancelOrder);

// Route for users to track their orders
router.get('/track-user-order',shipRocketController.trackUserOrder);

module.exports = router;