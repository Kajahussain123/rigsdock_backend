const express = require('express');
const router = express.Router();
const reviewController = require('../../../controllers/Vendor/Review/ReviewController');
const verifyToken = require('../../../middleware/jwt');

// get all reviews of vendor product
router.get('/product-reviews',verifyToken(['Vendor']),reviewController.getVendorProductReviews)

//get vendor profile
router.post('/respond/:reviewId',verifyToken(['Vendor']),reviewController.respondToReview);

// report unfair reviews
router.post('/report/:reviewId',verifyToken(['Vendor']),reviewController.reportReview);


module.exports = router;