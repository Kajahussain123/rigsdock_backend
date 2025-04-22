const express = require('express');
const router = express.Router();
const vendorController = require('../../../controllers/Admin/Vendor/VendorController');
const verifyToken = require('../../../middleware/jwt');
const multerConfig = require('../../../middleware/multer');
const gstVerificationController = require('../../../controllers/Admin/Vendor/GSTVerificationController')

const uploadFields = multerConfig.fields([
    { name: "images", maxCount: 5 },
    { name: "storelogo", maxCount: 1 },
    { name: "license", maxCount: 1 },
    { name: 'passbookPhoto', maxCount: 1 }
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
router.get('/pending',verifyToken(['Admin']),vendorController.getPendingVendors);

//search vendor
router.patch('/:vendorId/request',verifyToken(['Admin']),vendorController.handleVendorReq);

// get update profile pending vendor requests
router.get('/profile/pending',verifyToken(['Admin']),vendorController.getUpdateProfilePendingVendors);

//search vendor
router.patch('/profile/:vendorId/update',verifyToken(['Admin']),vendorController.handleVendorUpdateReq);

router.get('/reports', vendorController.getVendorMonthlyReport);

router.post(
    "/verifygst",
    verifyToken(["Admin"]),
    uploadFields,
    gstVerificationController.verifyGSTPost
  );
  router.get(
    "/verifygst",
    verifyToken(["Admin"]),
    gstVerificationController.verifyGSTGet
  );


module.exports = router;