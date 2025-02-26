const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/Admin/categoryController');
const verifyToken = require('../../middleware/jwt');
const multerConfig = require('../../middleware/multer');

// Create category
router.post('/create', verifyToken(['Admin']), multerConfig.single('image'), categoryController.createCategory);

// Get all categories
router.get('/view', verifyToken(['Admin']), categoryController.getCategories);

// Get a category by ID
router.get('/view/:id', verifyToken(['Admin']), categoryController.getCategoryById);

// Update category
router.patch('/update/:id', verifyToken(['Admin']), categoryController.updateCategory);

// Delete category
router.delete('/delete/:id', verifyToken(['Admin']), categoryController.deleteCategory);

module.exports = router;
