const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/Admin/categoryController');
const verifyToken = require('../../middleware/jwt');
const multerConfig = require('../../middleware/multer');

// Create category
router.post('/create', verifyToken(['admin']), multerConfig.single('image'), categoryController.createCategory);

// Get all categories
router.get('/view', verifyToken(['admin']), categoryController.getCategories);

// Get a category by ID
router.get('/view/:id', verifyToken(['admin']), categoryController.getCategoryById);

// Update category
router.patch('/update/:id', verifyToken(['admin']), categoryController.updateCategory);

// Delete category
router.delete('/delete/:id', verifyToken(['admin']), categoryController.deleteCategory);

module.exports = router;
