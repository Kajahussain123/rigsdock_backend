const express = require('express');
const router = express.Router();
const orderController = require('../../../controllers/Admin/Order/OrderController');
const verifyToken = require('../../../middleware/jwt');

// get all orders
router.get('/get',verifyToken(['Admin']),orderController.getAllOrders);

// update orderstatus
router.patch('/update/:orderId',verifyToken(['Admin']),orderController.updateOrderStatus);

// get order by id
router.get('/get/:orderId',verifyToken(['Admin']),orderController.getOrderById);

module.exports = router;