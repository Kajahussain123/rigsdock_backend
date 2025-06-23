const express = require("express");
const router = express.Router();
const brandController = require("../../controllers/Admin/Brand/brandController")

router.get("/view", brandController.getAllBrands);


module.exports = router;
