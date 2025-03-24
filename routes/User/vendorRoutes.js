const express = require('express');
const router = express.Router();
const vendorController = require('../../controllers/User/vendorController');
const multerConfig = require('../../middleware/multer');

const uploadFields = multerConfig.fields([
    { name: "images", maxCount: 5 },
    { name: "storelogo", maxCount: 1 },
    { name: "license", maxCount: 1 }
])

// vendor Registration
router.post('/register',uploadFields,vendorController.createVendor);


module.exports = router;
