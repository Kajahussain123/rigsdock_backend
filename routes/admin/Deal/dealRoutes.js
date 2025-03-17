const express = require("express");
const router = express.Router();
const dealController = require("../../../controllers/Admin/Deal/dealController");
const verifyToken = require("../../../middleware/jwt");

// Create Deal (Admin only)
router.post("/create", verifyToken(["Admin"]), dealController.createDeal);

// Get all Deals
router.get("/get", dealController.getDeals);

// Get Deal by ID
router.get("/get/:id", dealController.getDealById);

// Update Deal (Admin only)
router.patch("/update/:id", verifyToken(["Admin"]), dealController.updateDeal);

// Delete Deal (Admin only)
router.delete("/delete/:id", verifyToken(["Admin"]), dealController.deleteDeal);

module.exports = router;
