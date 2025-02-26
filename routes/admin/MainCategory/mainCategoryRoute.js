const express = require('express');
const router = express.Router();
const mainCategoryController = require('../../../controllers/Admin/MainCategory/MainCategoryController');

//create new maincategory
router.post('/create',mainCategoryController.createMainCategory);

//get maincategories
router.get('/get',mainCategoryController.getMainCategory);

module.exports = router;