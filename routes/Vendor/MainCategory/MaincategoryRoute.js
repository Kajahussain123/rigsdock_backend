const express = require('express');
const router = express.Router();
const mainCategoryController = require('../../../controllers/Vendor/MainCategory/MainCategoryController');
const verifyToken = require('../../../middleware/jwt');

//get maincategories
router.get('/get',verifyToken(['Vendor']),mainCategoryController.getMainCategory);

module.exports = router;