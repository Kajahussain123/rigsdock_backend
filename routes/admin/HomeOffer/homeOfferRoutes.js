const express = require("express");
const router = express.Router();
const homeOfferController = require("../../../controllers/Admin/HomeOffer/homeOfferController");
const verifyToken = require("../../../middleware/jwt");
const multerConfig = require("../../../middleware/multer");

// Create new home offer (Admin only, with image upload)
router.post("/create", verifyToken(["Admin"]), multerConfig.single("image"), homeOfferController.createHomeOffer);

// Get all home offers (with pagination and filtering)
router.get("/view", homeOfferController.getAllHomeOffers);

// Get home offer by ID
router.get("/view/:id", homeOfferController.getHomeOfferById);

// Update home offer (Admin only, with optional image update)
router.patch("/update/:id", verifyToken(["Admin"]), multerConfig.single("image"), homeOfferController.updateHomeOffer);

// Delete home offer (Admin only)
router.delete("/delete/:id", verifyToken(["Admin"]), homeOfferController.deleteHomeOffer);

// Get active home offers for public display (no auth required)
router.get("/active", homeOfferController.getActiveHomeOffers);

module.exports = router;