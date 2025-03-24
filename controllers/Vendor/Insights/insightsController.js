const Product = require('../../../models/admin/ProductModel');
const Review = require('../../../models/User/ReviesModel');

// Helper function to calculate average rating
const calculateAverageRating = (reviews) => {
    if (reviews.length === 0) return 0;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (totalRating / reviews.length).toFixed(2);
};

// Helper function to calculate rating distribution
const calculateRatingDistribution = (reviews) => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => distribution[review.rating]++);
    return distribution;
};

// Helper function to get top products
const getTopProducts = (products, reviews) => {
    const productRatings = {};

    // Calculate average rating for each product
    products.forEach(product => {
        const productReviews = reviews.filter(review => review.product._id.equals(product._id));
        if (productReviews.length > 0) {
            const totalRating = productReviews.reduce((sum, review) => sum + review.rating, 0);
            productRatings[product._id] = {
                name: product.name,
                averageRating: (totalRating / productReviews.length).toFixed(2),
                totalReviews: productReviews.length
            };
        }
    });

    // Sort products by average rating (descending)
    return Object.values(productRatings).sort((a, b) => b.averageRating - a.averageRating).slice(0, 5);
};

// Helper function to get recent reviews
const getRecentReviews = (reviews) => {
    return reviews
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by date (descending)
        .slice(0, 5); // Get the 5 most recent reviews
};

// Get customer feedback insights for logged-in vendor's products
exports.getCustomerFeedbackInsights = async (req, res) => {
    try {
        const vendorId = req.user.id;

        // Fetch all products belonging to the logged-in vendor
        const vendorProducts = await Product.find({ owner: vendorId }, { _id: 1, name: 1 });

        if (!vendorProducts.length) {
            return res.json({ success: true, message: 'No products found for this vendor', insights: {} });
        }

        // Extract product IDs
        const productIds = vendorProducts.map(product => product._id);

        // Fetch all reviews for the vendor's products
        const reviews = await Review.find({ product: { $in: productIds } })
            .populate('user', 'username email') // Populate user details
            .populate('product', 'name'); // Populate product details

        // Calculate insights
        const insights = {
            averageRating: calculateAverageRating(reviews),
            ratingDistribution: calculateRatingDistribution(reviews),
            topProducts: getTopProducts(vendorProducts, reviews),
            recentReviews: getRecentReviews(reviews)
        };

        res.json({ success: true, insights });
    } catch (error) {
        console.error('Error fetching customer feedback insights:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};