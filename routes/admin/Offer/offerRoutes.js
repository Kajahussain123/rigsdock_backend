const express = require("express");
const router = express.Router();
const offerController = require("../../../controllers/Admin/Offer/offerController");
const verifyToken = require("../../../middleware/jwt");

// Create Offer (Admin only)
router.post("/create", verifyToken(["Admin"]), offerController.createOffer);

// Get all Offers
router.get("/get", offerController.getOffers);

// Get Offer by ID
router.get("/get/:id", offerController.getOfferById);

// Update Offer (Admin only)
router.patch("/update/:id", verifyToken(["Admin"]), offerController.updateOffer);

// Delete Offer (Admin only)
router.delete("/delete/:id", verifyToken(["Admin"]), offerController.deleteOffer);

module.exports = router;
