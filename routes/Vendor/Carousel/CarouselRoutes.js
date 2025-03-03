const express = require("express");
const router = express.Router();
const carouselController = require("../../../controllers/Vendor/Carousel/vendorCarouselController");
const verifyToken = require("../../../middleware/jwt");
const multerConfig = require("../../../middleware/multer");

// Create carousel item
router.post("/create", verifyToken(["Vendor"]), multerConfig.single("image"), carouselController.createCarousel);

// Get carousel items
router.get("/view",verifyToken(["Vendor"]),carouselController.getCarousel);

// Update carousel item
router.patch("/update/:id", verifyToken(["Vendor"]), multerConfig.single("image"), carouselController.updateCarousel);

// Delete carousel item
router.delete("/delete/:id", verifyToken(["Vendor"]), carouselController.deleteCarousel);

module.exports = router;
 