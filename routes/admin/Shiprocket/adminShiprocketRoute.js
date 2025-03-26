const express = require('express');
const router = express.Router();
const shiprocketController = require('../../../controllers/Admin/Shiprocket/ShiprocketController');
const verifyToken = require('../../../middleware/jwt');

// get all order details
router.get('/get-all-orders-details',verifyToken(['Admin']),shiprocketController.getAllOrderDetailsFun);

// get order details by order id
router.get('/get-order/:orderId',verifyToken(['Admin']),shiprocketController.getOrderDetailsById)

// get order details by order id
router.get('/track-order/:orderId',verifyToken(['Admin']),shiprocketController.trackUserOrder)

module.exports = router;