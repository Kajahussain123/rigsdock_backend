const express = require('express');
const router = express.Router();
const dealOfTheDayController = require('../../controllers/User/DealoftheDayController');


router.get('/get',dealOfTheDayController.getAllDeals);

module.exports = router;