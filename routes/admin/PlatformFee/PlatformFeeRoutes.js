const express = require("express");
const { setPlatformFee, getPlatformFee } = require("../../../controllers/Admin/Platform Fee/platformController");
const router = express.Router();

router.post("/create", setPlatformFee);  // Admin sets fee
router.get("/get-fee", getPlatformFee);   // Fetch current fee

module.exports = router;
