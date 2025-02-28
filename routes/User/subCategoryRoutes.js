const express = require("express");
const router = express.Router();
const subCategoryController = require("../../controllers/User/subCategoryController");

router.get("/get",subCategoryController.getSubCategories);
router.get("/view/:mainCategoryId/:categoryId", subCategoryController.getSubCategoriesByMainAndCategory);

module.exports = router;
