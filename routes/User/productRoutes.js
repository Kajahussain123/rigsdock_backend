const express = require("express");
const router = express.Router();
const productController = require('../../controllers/User/ProductController');

// Get all products
router.get("/get", productController.getProducts);

router.get("/get/:id",productController.getProductById);

router.get("/get/similar/:id",productController.getSimilarProducts);

router.get("/get/:mainCategoryId/:categoryId/:subCategoryId", productController.getProductsByCategoryHierarchy);

router.get("/search/:query", productController.searchProductsByName);

router.get("/category/:categoryId/products",productController.getProductByCategory)

      
router.get("/filter", productController.getFilteredProducts);

router.get("/filter/brand/:brandName", productController.getProductsByBrand);

router.get("/filter/price", productController.getProductsByPriceRange);

router.get("/filter/rating", productController.getProductsByRating);



module.exports = router;
