const express = require("express");
const router = express.Router();
const productController = require('../../../controllers/Admin/Product/ProductController');

// create new subcategory
router.post("/create", productController.createProduct);

module.exports = router;