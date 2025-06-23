const express = require('express');
const router = express.Router();
const homeOfferController = require('../../controllers/Admin/HomeOffer/homeOfferController');


router.get('/get',homeOfferController.getAllHomeOffers);

module.exports = router;