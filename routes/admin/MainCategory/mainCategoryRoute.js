const express = require('express');
const router = express.Router();
const mainCategoryController = require('../../../controllers/Admin/MainCategory/MainCategoryController');
const verifyToken = require('../../../middleware/jwt')

//create new maincategory
router.post('/create',verifyToken(['Admin']),mainCategoryController.createMainCategory);

//get maincategories
router.get('/get',verifyToken(['Admin']),mainCategoryController.getMainCategory);

module.exports = router;