const express = require('express');
const router = express.Router();
const reviewController = require('../../../controllers/Admin/Review/ReviewController');
const verifyToken = require('../../../middleware/jwt');

// get all reviews of vendor product
router.get('/reported-reviews',verifyToken(['Admin']),reviewController.getReportedReviews)

//get vendor profile
router.post('/resolve-review/:reviewId',verifyToken(['Admin']),reviewController.resolveReportedReview);


module.exports = router;