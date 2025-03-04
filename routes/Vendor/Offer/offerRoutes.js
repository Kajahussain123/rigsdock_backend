const express = require("express");
const router = express.Router();
const offerController = require("../../../controllers/Vendor/Offer/OfferController");
const verifyToken = require("../../../middleware/jwt");

// Create offer (only admin)
router.post("/create", verifyToken(["Vendor"]), offerController.createOffer);

// Get all offers
router.get("/get",verifyToken(["Vendor"]),offerController.getOffers);

// Get offer by ID
router.get("/get/:id",verifyToken(["Vendor"]),offerController.getOfferById);

// Update offer (only Vendor)
router.patch("/update/:id", verifyToken(["Vendor"]), offerController.updateOffer);

// Delete offer (only Vendor)
router.delete("/delete/:id", verifyToken(["Vendor"]), offerController.deleteOffer);

module.exports = router;
