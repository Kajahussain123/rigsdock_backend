const express = require('express');
const router = express.Router();
const financialController = require('../../../controllers/Admin/Financial/FinancialController');
const verifyToken = require('../../../middleware/jwt');

// get total earnings from delivered orders\
router.get("/get",verifyToken(['Admin']),financialController.getTotalEarnings);

module.exports = router