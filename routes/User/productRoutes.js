const express = require("express");
const router = express.Router();
const productController = require('../../controllers/User/ProductController');

// Get all products
router.get("/get", productController.getProducts);

router.get("/get/:id",productController.getProductById);

router.get("/get/:mainCategoryId/:categoryId/:subCategoryId", productController.getProductsByCategoryHierarchy);

module.exports = router;
