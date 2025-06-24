const express = require("express");
const router = express.Router();
const homeOfferController = require("../../../controllers/Admin/HomeOffer/homeOfferController");
const verifyToken = require("../../../middleware/jwt");
const multerConfig = require("../../../middleware/multer");

// Create new home offer (Admin only, with image upload)
router.post("/create", verifyToken(["Admin"]), multerConfig.single("image"), homeOfferController.createHomeOffer);

// Get all home offers (with pagination and filtering)
router.get("/view", homeOfferController.getAllHomeOffers);

router.get("/view/:id", homeOfferController.getHomeOfferById);

router.patch("/update/:id", verifyToken(["Admin"]), multerConfig.single("image"), homeOfferController.updateHomeOffer);

router.delete("/delete/:id", verifyToken(["Admin"]), homeOfferController.deleteHomeOffer);

router.get("/active", homeOfferController.getActiveHomeOffers);

module.exports = router;