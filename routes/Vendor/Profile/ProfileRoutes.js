const express = require('express');
const router = express.Router();
const profileController = require('../../../controllers/Vendor/Profile/ProfileController');
const verifyToken = require('../../../middleware/jwt');
const multerConfig = require('../../../middleware/multer');

const uploadFields = multerConfig.fields([
    { name: "images", maxCount: 5 },
    { name: "storelogo", maxCount: 1 },
    { name: "license", maxCount: 1 }
])

//get vendor profile
router.get('/view',verifyToken(['Vendor']),profileController.getVendorProfile)

//update vendor profile
router.patch('/update',verifyToken(['Vendor']),uploadFields,profileController.updateProfile)

module.exports = router;