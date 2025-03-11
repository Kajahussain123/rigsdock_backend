const express = require('express');
const router = express.Router();
const dashboardController = require('../../../controllers/Admin/Dashboard/DashboardController');
const verifyToken = require("../../../middleware/jwt");

// get sales total
router.get("/sales",verifyToken(["Admin"]),dashboardController.getTotalSales);

// get total products ordered
router.get("/total-products-ordered",verifyToken(["Admin"]),dashboardController.getTotalProductsOrdered);

// get total customers
router.get("/total-customers",verifyToken(["Admin"]),dashboardController.getTotalRegisteredUsers);

// graph
router.get("/monthly-sales",verifyToken(["Admin"]),dashboardController.priceGraph);

// total pending orders
router.get("/total-pending-orders",verifyToken(["Admin"]),dashboardController.getPendingOrders);

// get available years for dropdown
router.get("/get-years",verifyToken(["Admin"]),dashboardController.getAvailableYears);

module.exports = router;