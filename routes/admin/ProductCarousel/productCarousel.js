const express = require("express");
const router = express.Router();
const carouselController = require("../../../controllers/Admin/ProductCarousel/productCarouselController");
const verifyToken = require("../../../middleware/jwt");
const multerConfig = require("../../../middleware/multer");

router.post("/create", verifyToken(["Admin"]), multerConfig.single("image"), carouselController.createCarousel);

router.get("/view", carouselController.getAllCarousels);

router.patch("/update/:id", verifyToken(["Admin"]), multerConfig.single("image"), carouselController.updateCarousel);

router.delete("/delete/:id", verifyToken(["Admin"]), carouselController.deleteCarousel);

module.exports = router;
 