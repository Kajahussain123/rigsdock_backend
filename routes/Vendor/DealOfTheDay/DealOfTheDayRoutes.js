const express = require('express');
const router = express.Router();
const dealOfTheDayController = require('../../../controllers/Vendor/DealOfTheDay/DealOfTheDayController');
const verifyToken = require('../../../middleware/jwt');

// create new deal of the
router.post('/create',verifyToken(['Vendor']),dealOfTheDayController.addDealOfTheDay);

//  update deal of the day price
router.delete('/delete/:dealId',verifyToken(['Vendor']),dealOfTheDayController.deleteDealOfTheDay);

router.get('/get',verifyToken(['Vendor']),dealOfTheDayController.getAllDeals);

module.exports = router;