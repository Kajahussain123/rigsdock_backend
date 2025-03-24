const express = require("express");
const router = express.Router();
const analyticsController = require("../../../controllers/Vendor/Analytics/VendorAnalyticsController");
const verifyToken = require("../../../middleware/jwt");

// get top 5 sell products 
router.get("/get", verifyToken(["Vendor"]),analyticsController.getTopSellingProductsForVendor);

// Route to get peak selling time
router.get("/peak-selling-time", verifyToken(["Vendor"]),analyticsController.getVendorPeakSellingTime);

module.exports = router;