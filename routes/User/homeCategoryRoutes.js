const express = require('express');
const router = express.Router();
const homeCategoryController = require('../../controllers/Admin/HomeCategory/homeCategoryController');


router.get('/get',homeCategoryController.getAllHomeCategories);

module.exports = router;