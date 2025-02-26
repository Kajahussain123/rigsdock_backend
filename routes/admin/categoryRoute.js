const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/Admin/categoryController');
const verifyToken = require('../../middleware/jwt');
const multerConfig = require('../../middleware/multer');

// Create category
router.post('/create',  multerConfig.single('image'), categoryController.createCategory);

// Get all categories
router.get('/view',  categoryController.getCategories);

// Get a category by ID
router.get('/view/:id',  categoryController.getCategoryById);

// Update category
router.patch('/update/:id',  categoryController.updateCategory);

// Delete category
router.delete('/delete/:id',  categoryController.deleteCategory);

module.exports = router;
