const express = require("express");
const router = express.Router();
const subCategoryController = require("../../../controllers/Admin/SubCategory/SubCategorycontroller");

// create new subcategory
router.post("/create", subCategoryController.createSubCategory);

// get all subcategories
router.get("/get", subCategoryController.getSubCategories);

// get a subcategory by id
router.get("/get/:id", subCategoryController.getSubCategoryById);

// // view subcategory by categoryId
// router.get('/view/subcategory/:id',subCategoryController.getSubCategoryByCategory);

// update subcategory
router.patch("/update/:id", subCategoryController.updateSubCategory);

// delete subcategory
router.delete("/delete/:id", subCategoryController.deleteSubCategory);

module.exports = router;
