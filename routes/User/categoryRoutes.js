const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/User/CategoryController');

// Get all categories
router.get('/view', categoryController.getCategories);

// Get subcategories by main category ID
router.get('/view/:mainCategoryId', categoryController.getSubCategoriesByMainCategory);

module.exports = router;
