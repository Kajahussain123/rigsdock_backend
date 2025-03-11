const express = require('express');
const router = express.Router();
const dashboardController = require('../../../controllers/Vendor/Dashboard/VendorDashboardController');
const verifyToken = require("../../../middleware/jwt");

// get sales total
router.get("/sales",verifyToken(["Vendor"]),dashboardController.getVendorSales);

// get total products ordered
router.get("/total-products-ordered",verifyToken(["Vendor"]),dashboardController.getVendorProductsOrdered);

// total pending orders
router.get("/total-pending-orders",verifyToken(["Vendor"]),dashboardController.getVendorPendingOrders);

// graph
router.get("/monthly-sales",verifyToken(["Vendor"]),dashboardController.vendorPriceGraph);

// get available years for dropdown
router.get("/get-years",verifyToken(["Vendor"]),dashboardController.getAvailableYears);

module.exports = router;