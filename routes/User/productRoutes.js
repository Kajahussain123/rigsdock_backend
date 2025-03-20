const express = require("express");
const router = express.Router();
const productController = require('../../controllers/User/ProductController');

// Get all products
router.get("/get", productController.getProducts);

router.get("/get/:id",productController.getProductById);

router.get("/get/similar/:id",productController.getSimilarProducts);

router.get("/get/:mainCategoryId/:categoryId/:subCategoryId", productController.getProductsByCategoryHierarchy);

router.get("/search/:query", productController.searchProductsByName);

router.get("/filter-by-brand", productController.filterProductsByBrand);

// 💰 Filter Products by Price Range
router.get("/filter-by-price-range", productController.filterProductsByPriceRange);

// ⭐ Filter Products by Rating
router.get("/filter-by-rating", productController.filterProductsByRating);

module.exports = router;
