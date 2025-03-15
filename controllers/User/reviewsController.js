const Review = require("../../models/User/ReviesModel");
const Product = require("../../models/admin/ProductModel");
const Order = require("../../models/User/OrderModel");
const upload = require("../../middleware/multer");

// Add a review
exports.addReview = async (req, res) => {
    try {
        const { userId, productId, rating, review } = req.body;
        const images = req.files ? req.files.map(file => file.path) : []; // Get uploaded image paths

        // Check if the user has purchased the product & order is delivered
        const order = await Order.findOne({
            user: userId,
            "items.product": productId,
            orderStatus: "Delivered" // Ensure the order is delivered
        });

        // console.log("Order found:", order);

        if (!order) {
            return res.status(400).json({ message: "You can only review products that have been delivered." });
        }

        // Check if the user already reviewed the product
        const existingReview = await Review.findOne({ user: userId, product: productId });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this product." });
        }

        // Create a new review
        const newReview = new Review({
            user: userId,
            product: productId,
            rating,
            review,
            images // Save array of image paths
        });

        await newReview.save();

        res.status(201).json({ message: "Review added successfully", review: newReview });
    } catch (error) {
        res.status(500).json({ message: "Error adding review", error: error.message });
    }
};

// Get all reviews for a product
exports.getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        const reviews = await Review.find({ product: productId })
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({ reviews });
    } catch (error) {
        res.status(500).json({ message: "Error fetching reviews", error: error.message });
    }
};

// Get a specific review by ID
exports.getReviewById = async (req, res) => {
    try {
        const { reviewId } = req.params;

        const review = await Review.findById(reviewId).populate("user", "name email");

        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.status(200).json({ review });
    } catch (error) {
        res.status(500).json({ message: "Error fetching review", error: error.message });
    }
};

// Update a review
exports.updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, review } = req.body;

        const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            { rating, review },
            { new: true }
        );

        if (!updatedReview) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.status(200).json({ message: "Review updated successfully", review: updatedReview });
    } catch (error) {
        res.status(500).json({ message: "Error updating review", error: error.message });
    }
};

// Delete a review
exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        const deletedReview = await Review.findByIdAndDelete(reviewId);

        if (!deletedReview) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting review", error: error.message });
    }
};

// Get all reviews for a user
exports.getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;

        const reviews = await Review.find({ user: userId })
            .populate("product", "name price")
            .sort({ createdAt: -1 });

        res.status(200).json({ reviews });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user reviews", error: error.message });
    }
};
