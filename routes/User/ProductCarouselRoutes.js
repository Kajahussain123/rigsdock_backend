const express = require("express");
const router = express.Router();
const productCarouselController = require('../../controllers/Admin/ProductCarousel/productCarouselController');

// Get all products
router.get("/get", productCarouselController.getAllCarousels);




module.exports = router;
