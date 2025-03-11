const express = require("express");
const router = express.Router();
const reviewController = require("../../controllers/User/reviewsController");

// Add a new review (only if order is delivered)
router.post("/add", reviewController.addReview);

// Get all reviews for a product
router.get("/product/:productId", reviewController.getProductReviews);

// Get a single review by ID
router.get("/:reviewId", reviewController.getReviewById);

// Update a review
router.patch("/update/:reviewId", reviewController.updateReview);

// Delete a review
router.delete("/delete/:reviewId", reviewController.deleteReview);

module.exports = router;
