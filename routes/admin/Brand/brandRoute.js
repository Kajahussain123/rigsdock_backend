const express = require("express");
const router = express.Router();
const brandController = require('../../../controllers/Admin/Brand/brandController');
const multerConfig = require('../../../middleware/multer');
const verifyToken = require('../../../middleware/jwt');

// Upload configuration (single image field)
const upload = multerConfig.single("image");

// Create a new brand
router.post("/create", verifyToken(['Admin']), upload, brandController.createBrand);

// Get all brands
router.get("/get", verifyToken(['Admin']), brandController.getAllBrands);

// Get brand by ID
router.get("/get/:id", verifyToken(['Admin']), brandController.getBrandById);

// Update brand
router.patch("/update/:id", verifyToken(['Admin']), upload, brandController.updateBrand);

// Delete brand
router.delete("/delete/:id", verifyToken(['Admin']), brandController.deleteBrand);

module.exports = router;
