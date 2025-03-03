const express = require("express");
const router = express.Router();
const productController = require('../../../controllers/Vendor/Product/VendorProductController');
const multerConfig = require('../../../middleware/multer');
const verifyToken = require('../../../middleware/jwt');

const upload = multerConfig.array("images", 5);

// create new product
router.post("/create",verifyToken(['Vendor']),upload,productController.createProduct);

// get all products
router.get("/get",verifyToken(['Vendor']),productController.getProducts);

// get product by id
router.get("/get/:id",verifyToken(['Vendor']),productController.getProductById);

// update product by id
router.patch("/update/:id",verifyToken(['Vendor']),upload,productController.updateProduct);

// delete product
router.delete("/delete/:id",verifyToken(['Vendor']),productController.deleteProduct);

// Delete a specific image by name
router.delete("/delete/:id/image",verifyToken(['Vendor']),productController.deleteProductImage);

module.exports = router;