const express = require("express");
const router = express.Router();
const subCategoryController = require("../../../controllers/Admin/SubCategory/SubCategorycontroller");
const verifyToken = require('../../../middleware/jwt');

// create new subcategory
router.post("/create", verifyToken(['Admin']),subCategoryController.createSubCategory);

// get all subcategories
router.get("/get", verifyToken(['Admin']),subCategoryController.getSubCategories);

// get a subcategory by id
router.get("/get/:id", verifyToken(['Admin']),subCategoryController.getSubCategoryById);

// view subcategory by categoryId
router.get('/view/subcategory/:id',verifyToken(['Admin']),subCategoryController.getSubCategoryByCategory);

// update subcategory
router.patch("/update/:id",verifyToken(['Admin']), subCategoryController.updateSubCategory);

// delete subcategory
router.delete("/delete/:id",verifyToken(['Admin']), subCategoryController.deleteSubCategory);

router.get("/view/:mainCategoryId/:categoryId",verifyToken(['Admin']), subCategoryController.getSubCategoriesByMainAndCategory);


module.exports = router;
