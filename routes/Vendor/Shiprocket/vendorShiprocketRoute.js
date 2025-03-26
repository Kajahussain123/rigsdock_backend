const express = require('express');
const router = express.Router();
const shiprocketController = require('../../../controllers/Vendor/Shiprocket/vendorShiprocketController');
const verifyToken = require('../../../middleware/jwt');

//get vendor orders
router.get('/vendor-orders/:orderId',verifyToken(['Vendor']),shiprocketController.getOrderById);

router.get('/track-vendor-order/:orderId',verifyToken(['Vendor']),shiprocketController.trackVendorOrder)

module.exports = router;