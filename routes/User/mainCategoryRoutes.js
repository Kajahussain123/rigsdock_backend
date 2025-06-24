const express = require('express');
const router = express.Router();
const mainCategoryController = require('../../controllers/User/mainCategoryController');


router.get('/get',mainCategoryController.getMainCategory);

module.exports = router;



