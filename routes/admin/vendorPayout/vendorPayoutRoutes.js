const express = require('express');
const router = express.Router();
const vendorPayoutController = require('../../../controllers/Admin/VendorPayout/VendorPayoutController');
const verifyToken = require('../../../middleware/jwt');

// get all vendorpayouts
router.get("/get",verifyToken(['Admin']),vendorPayoutController.getAllVendorPayouts)

// update vendor payout status by id
router.patch("/update/:vendorPayoutId",verifyToken(['Admin']),vendorPayoutController.markPayoutAsPaid);

module.exports = router;