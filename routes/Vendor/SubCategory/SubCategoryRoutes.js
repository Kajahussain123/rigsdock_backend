const express = require('express');
const router = express.Router();
const subcategoryController = require('../../../controllers/Vendor/SubCategory/SubCategoryController');
const verifyToken = require('../../../middleware/jwt')


// Get all categories
router.get('/view',verifyToken(['Vendor']),subcategoryController.getSubCategories);

// Get categories by main category ID
router.get('/view/:categoryId',verifyToken(['Vendor']),subcategoryController.getSubCategoryByCategory);

module.exports = router;