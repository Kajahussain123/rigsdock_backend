const express = require('express');
const router = express.Router();
const vendorController = require('../../../controllers/Admin/Vendor/VendorController');
const verifyToken = require('../../../middleware/jwt');
const multerConfig = require('../../../middleware/multer');

const uploadFields = multerConfig.fields([
    { name: "images", maxCount: 5 },
    { name: "storelogo", maxCount: 1 },
    { name: "license", maxCount: 1 }
])

//create new vendor
router.post('/create',verifyToken(['Admin']),uploadFields,vendorController.createVendor);

//get all vendors
router.get('/get',verifyToken(['Admin']),vendorController.getAllVendors);

//get vendor by id
router.get('/get/:id',verifyToken(['Admin']),vendorController.getVendorById);

//updated a vendor
router.patch('/update/:id',verifyToken(['Admin']),uploadFields,vendorController.updateVendor);

//delete a vendor
router.delete('/delete/:id',verifyToken(['Admin']),vendorController.deleteVendor);

// delete a vendor image
router.delete('/delete-vendor-image/:id',verifyToken(['Admin']),vendorController.deleteVendorImage);

//search vendor
router.get('/search',verifyToken(['Admin']),vendorController.searchVendors);

// get pending vendor requests
router.get('/vendors/pending',verifyToken(['Admin']),vendorController.getPendingVendors);

//search vendor
router.patch('/vendors/:vendorId/request',verifyToken(['Admin']),vendorController.handleVendorReq);

module.exports = router;