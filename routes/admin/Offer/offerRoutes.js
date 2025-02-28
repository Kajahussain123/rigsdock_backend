const express = require("express");
const router = express.Router();
const offerController = require("../../../controllers/Admin/Offer/offerController");
const verifyToken = require("../../../middleware/jwt");

// Create offer (only admin)
router.post("/create", verifyToken(["Admin"]), offerController.createOffer);

// Get all offers
router.get("/get", offerController.getOffers);

// Get offer by ID
router.get("/get/:id", offerController.getOfferById);

// Update offer (only admin)
router.patch("/update/:id", verifyToken(["Admin"]), offerController.updateOffer);

// Delete offer (only admin)
router.delete("/delete/:id", verifyToken(["Admin"]), offerController.deleteOffer);

module.exports = router;
