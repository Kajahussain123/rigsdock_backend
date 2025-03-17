const express = require("express");
const router = express.Router();
const analyticsController = require("../../../controllers/Admin/Analytics/AnalyticsController");
const verifyToken = require("../../../middleware/jwt");

// get top 5 sell products 
router.get("/get", verifyToken(["Admin"]),analyticsController.getTopSellingProducts);

// Route to get peak selling time
router.get("/peak-selling-time", verifyToken(["Admin"]),analyticsController.getPeakSellingTime);

module.exports = router;