const express = require("express");
const router = express.Router();
const productController = require('../../../controllers/Admin/Product/ProductController');
const multerConfig = require('../../../middleware/multer');
const verifyToken = require('../../../middleware/jwt');

// const upload = multerConfig.array("images", 5);
const upload = multerConfig.fields([
    { name: "images", maxCount: 5 },
    { name: "file", maxCount: 1 },
])

// create new product
router.post("/create",verifyToken(['Admin']),upload,productController.createProduct);

// get all products
router.get("/get",verifyToken(['Admin']),productController.getProducts);

// get product by id
router.get("/get/:id",verifyToken(['Admin']),productController.getProductById);

// update product by id
router.patch("/update/:id",verifyToken(['Admin']),upload,productController.updateProduct);

// delete product
router.delete("/delete/:id",verifyToken(['Admin']),productController.deleteProduct);

// Delete a specific image by name
router.delete("/delete/:id/image",verifyToken(['Admin']),productController.deleteProductImage);

// Delete a specific attribute field in a product
router.delete("/:productId/attributes-delete",verifyToken(['Admin']),productController.deleteAttribute);

// Bulk product upload
router.post("/bulk-upload",verifyToken(['Admin']),upload,productController.productBulkUpload)

module.exports = router;