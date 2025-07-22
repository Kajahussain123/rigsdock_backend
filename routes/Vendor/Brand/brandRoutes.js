const express = require("express");
const router = express.Router();
const brandController = require('../../../controllers/Vendor/Brand/brandController');
const verifyToken = require('../../../middleware/jwt');

// Get all brands
router.get("/get", verifyToken(['Vendor']), brandController.getAllBrands);

// Get brand by ID
router.get("/get/:id", verifyToken(['Vendor']), brandController.getBrandById);


module.exports = router;
