const express = require('express');
const router = express.Router();
const categoryController = require('../../../controllers/Vendor/Category/CategoryController');
const verifyToken = require('../../../middleware/jwt')


// Get all categories
router.get('/view',verifyToken(['Vendor']),categoryController.getCategories);

// Get categories by main category ID
router.get('/view/:mainCategoryId',verifyToken(['Vendor']),categoryController.getCategoriesByMainCategory);

module.exports = router;