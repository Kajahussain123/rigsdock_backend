const express = require("express");
const router = express.Router();
const carouselController = require("../../../controllers/Admin/Carousel/carouselController");
const verifyToken = require("../../../middleware/jwt");
const multerConfig = require("../../../middleware/multer");

// Create carousel item
router.post("/create", verifyToken(["Admin"]), multerConfig.single("image"), carouselController.createCarousel);

// Get carousel items
router.get("/view", carouselController.getCarousel);

// Update carousel item
router.patch("/update/:id", verifyToken(["Admin"]), multerConfig.single("image"), carouselController.updateCarousel);

// Delete carousel item
router.delete("/delete/:id", verifyToken(["Admin"]), carouselController.deleteCarousel);

module.exports = router;
 