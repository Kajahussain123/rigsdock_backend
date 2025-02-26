const express = require("express");
const router = express.Router();
const productController = require('../../../controllers/Admin/Product/ProductController');
const multerConfig = require('../../../middleware/multer');

const upload = multerConfig.array("images", 5);

// create new product
router.post("/create",upload,productController.createProduct);

// get all products
router.get("/get", productController.getProducts);

// get product by id
router.get("/get/:id", productController.getProductById);

// update product by id
router.patch("/update/:id",upload,productController.updateProduct);

// delete product
router.delete("/delete/:id", productController.deleteProduct);

// Delete a specific image by name
router.delete("/delete/:id/image", productController.deleteProductImage);

module.exports = router;