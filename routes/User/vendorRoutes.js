const express = require('express');
const router = express.Router();
const vendorController = require('../../controllers/User/vendorController');
const multerConfig = require('../../middleware/multer');
const gstVerificationController = require("../../controllers/Admin/Vendor/GSTVerificationController");
const { panController, bankController } = require('../../controllers/Admin/Vendor/VerificationController');

const uploadFields = multerConfig.fields([
    { name: "images", maxCount: 5 },
    { name: "storelogo", maxCount: 1 },
    { name: "license", maxCount: 1 },
    { name: 'passbookPhoto', maxCount: 1 },
])

// vendor Registration
router.post('/register',uploadFields,vendorController.createVendor);

router.post(
    "/verifygst",
    uploadFields,
    gstVerificationController.verifyGSTPost
  );
  router.get(
    "/verifygst",
    gstVerificationController.verifyGSTGet
  );
  router.get(
    "/verifypan",
    panController.verifyPANGet
  );
  router.post(
    "/verifypan",
    panController.verifyPANPost
  );
  router.get(
    "/verifyaccount",
    bankController.verifyBankAccountGet
  );
  router.post(
    "/verifyaccount",
    bankController.verifyBankAccountPost
  );


module.exports = router;
