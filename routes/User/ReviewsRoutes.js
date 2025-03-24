const express = require("express");
const router = express.Router();
const reviewController = require("../../controllers/User/reviewsController");
const upload = require('../../middleware/multer')

// Add a new review (only if order is delivered)
router.post("/add",upload.array("images", 5), reviewController.addReview);

// Get all reviews for a product
router.get("/product/:productId", reviewController.getProductReviews);

// Get a single review by ID
router.get("/:reviewId", reviewController.getReviewById);

// get user all review by id 
router.get("/user/:userId",reviewController.getUserReviews)

// Update a review
router.patch("/update/:reviewId", reviewController.updateReview);

// Delete a review
router.delete("/delete/:reviewId", reviewController.deleteReview);

module.exports = router;
