const express = require('express');
const router = express.Router();
const vendorController = require('../../../controllers/Vendor/Auth/Auth');
const multerConfig = require('../../../middleware/multer');

const uploadFields = multerConfig.fields([
    { name: "images", maxCount: 5 },
    { name: "storelogo", maxCount: 1 },
    { name: "license", maxCount: 1 }
])

// vendor Registration
router.post('/register',uploadFields,vendorController.createVendor);

// vendor Login
router.post('/login', vendorController.login);

module.exports = router;