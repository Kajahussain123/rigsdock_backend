const DealOfTheDay = require('../../../models/Vendor/DealofthedayModel');
const Product = require('../../../models/admin/ProductModel');
// Create deal of the day
exports.addDealOfTheDay = async(req, res) => {
    try {
        const { productId, offerPrice } = req.body;
        // Check if this product already has an active deal
        const existingProductDeal = await DealOfTheDay.findOne({
            product: productId,
            status: "active",
            vendor: req.user.id
        });
        if(existingProductDeal) {
            return res.status(400).json({
                message: "This product already has an active deal"
            });
        }
        const product = await Product.findById(productId);
        if(!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Validate offer price
        if(offerPrice >= product.price) {
            return res.status(400).json({
                message: "Offer price must be less than original price"
            });
        }
        // Update the product's finalPrice
        product.finalPrice = offerPrice;
        await product.save();
        // Create a new deal
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        const deal = new DealOfTheDay({
            product: productId,
            offerPrice,
            vendor: req.user.id,
            status: "active",
            expiresAt,
            originalPrice: product.price // Store original price for reference
        });
        await deal.save();
        res.status(201).json({
            message: "Deal of the Day added successfully",
            deal
        });
    } catch (error) {
        console.error("Error adding deal:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
// Delete deal of the day
exports.deleteDealOfTheDay = async (req, res) => {
    try {
        const { dealId } = req.params;
        // Find the deal
        const deal = await DealOfTheDay.findById(dealId);
        if (!deal) {
            return res.status(404).json({ message: "Deal not found" });
        }
        // Verify vendor ownership
        if (deal.vendor.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Unauthorized to delete this deal"
            });
        }
        // Revert the product's finalPrice to original price
        const product = await Product.findById(deal.product);
        if (product) {
            product.finalPrice = deal.originalPrice;
            await product.save();
        }
        // Delete the deal
        await DealOfTheDay.findByIdAndDelete(dealId);
        res.status(200).json({ message: "Deal deleted successfully" });
    } catch (error) {
        console.error("Error deleting deal:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
// Get all deals for vendor
exports.getAllDeals = async(req, res) => {
    try {
        const deals = await DealOfTheDay.find({
            vendor: req.user.id,
            status: "active"
        }).populate('product', 'name images price');
        // Add remaining time to each deal
        const dealsWithCountdown = deals.map(deal => {
            const currentTime = new Date();
            const expiresAt = new Date(deal.expiresAt);
            const remainingTime = expiresAt - currentTime;
            return {
                ...deal.toObject(),
                remainingTime: remainingTime > 0 ? remainingTime : 0,
                isExpired: remainingTime <= 0
            };
        });
        res.status(200).json(dealsWithCountdown);
    } catch (error) {
        console.error("Error getting deals:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
// Optional: Add this if you want to automatically expire deals
exports.expireOldDeals = async () => {
    try {
        const now = new Date();
        const expiredDeals = await DealOfTheDay.find({
            expiresAt: { $lte: now },
            status: "active"
        });
        for (const deal of expiredDeals) {
            // Revert product price
            const product = await Product.findById(deal.product);
            if (product) {
                product.finalPrice = deal.originalPrice;
                await product.save();
            }
            // Mark deal as expired
            deal.status = "expired";
            await deal.save();
        }
    } catch (error) {
        console.error("Error expiring deals:", error);
    }
}