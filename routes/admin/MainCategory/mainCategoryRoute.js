const express = require('express');
const router = express.Router();
const mainCategoryController = require('../../../controllers/Admin/MainCategory/MainCategoryController');
const verifyToken = require('../../../middleware/jwt')
const multerConfig = require('../../../middleware/multer');

//create new maincategory
router.post('/create',verifyToken(['Admin']),multerConfig.single('image'),mainCategoryController.createMainCategory);

//get maincategories
router.get('/get',verifyToken(['Admin']),mainCategoryController.getMainCategory);

// router.patch('/update/:id',verifyToken(['Admin']),multerConfig.single('image'),mainCategoryController.updateMaincategory);


module.exports = router;