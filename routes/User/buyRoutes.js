const express = require('express');
const router = express.Router();
const buyController = require('../../controllers/User/Buycontroller');


// Buy now (direct purchase)
router.post('/', buyController.buyNow);


module.exports = router;