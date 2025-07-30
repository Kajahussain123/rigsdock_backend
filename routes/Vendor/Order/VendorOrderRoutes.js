const express = require('express');
const router = express.Router();
const orderController = require('../../../controllers/Vendor/Order/OrderController');
const verifyToken = require('../../../middleware/jwt');

// get all order by vendor id
router.get("/get",verifyToken(['Vendor']),orderController.getAllOrders);

router.get("/get/:orderId",verifyToken(['Vendor']),orderController.getOrderById);

router.get("/:orderId/invoice", verifyToken(['Vendor']), orderController.generateVendorInvoice);

module.exports = router;