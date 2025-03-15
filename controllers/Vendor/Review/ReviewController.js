const Review = require('../../../models/User/ReviesModel');
const Product = require('../../../models/admin/ProductModel');

// get all reviews of vendor product 
exports.getVendorProductReviews = async (req, res) => {
    try {
        const vendorId = req.user.id;

        const vendorProducts = await Product.find({ owner: vendorId }, { _id: 1 });

        if (!vendorProducts.length) {
            return res.json({ success: true, message: 'No products found for this vendor', reviews: [] });
        }

        const productIds = vendorProducts.map(product => product._id);

        const reviews = await Review.find({ product: { $in: productIds } })
            .populate('user', 'username email') 
            .populate('product', 'name'); 

        res.json({ success: true, reviews });
    } catch (error) {
        console.error('Error fetching vendor product reviews:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Respond to a review
exports.respondToReview = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { response } = req.body;
        const { reviewId } = req.params;

        // Find the review
        const review = await Review.findById(reviewId).populate('product');
        console.log('review',review.product._id)

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Check if the product belongs to the logged-in vendor
        const product = await Product.findOne({ _id: review.product._id, owner: vendorId });
        console.log('product',product)
        if (!product) {
            return res.status(403).json({ success: false, message: 'You can only respond to reviews for your own products' });
        }

        // Update the review with the vendor's response
        review.response = response;
        await review.save();

        res.json({ success: true, message: 'Response added successfully', review });
    } catch (error) {
        console.error('Error responding to review:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Report an unfair review
exports.reportReview = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { reason } = req.body;
        const { reviewId } = req.params;

        // Find the review
        const review = await Review.findById(reviewId).populate('product');

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Check if the product belongs to the logged-in vendor
        const product = await Product.findOne({ _id: review.product._id, owner: vendorId });

        if (!product) {
            return res.status(403).json({ success: false, message: 'You can only report reviews for your own products' });
        }

        // Update the review with the report
        review.report = {
            reportedBy: vendorId,
            reason: reason,
            status: "Pending"
        };
        await review.save();

        res.json({ success: true, message: 'Review reported successfully', review });
    } catch (error) {
        console.error('Error reporting review:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};