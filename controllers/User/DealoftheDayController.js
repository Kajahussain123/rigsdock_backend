const DealOfTheDay = require('../../models/Vendor/DealofthedayModel');
const Product = require('../../models/admin/ProductModel');

// Get all deals with product details
exports.getAllDeals = async (req, res) => {
    try {
        // Populate the 'product' field to fetch full product details
        const deals = await DealOfTheDay.find().populate('product');

        // Add remaining time to each deal
        const dealsWithCountdown = deals.map(deal => {
            const currentTime = new Date();
            const expiresAt = new Date(deal.expiresAt);
            const remainingTime = expiresAt - currentTime; // Time difference in milliseconds

            return {
                ...deal.toObject(), // Convert Mongoose document to plain object
                remainingTime: remainingTime > 0 ? remainingTime : 0, // Ensure remaining time is not negative
            };
        });

        res.status(200).json(dealsWithCountdown);
    } catch (error) {
        console.error("Error fetching deals:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
