const Review = require('../../../models/User/ReviesModel');

// Get all reported reviews (for admin)
exports.getReportedReviews = async (req, res) => {
    try {
        const reportedReviews = await Review.find({ 'report.status': 'Pending' })
            .populate('user', 'username email')
            .populate('product', 'name')
            .populate('report.reportedBy', 'username email');

        res.json({ success: true, reportedReviews });
    } catch (error) {
        console.error('Error fetching reported reviews:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Resolve a reported review (for admin)
exports.resolveReportedReview = async (req, res) => {
    try {
        const { action } = req.body;
        const { reviewId } = req.params;

        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        if (action === 'delete') {
            await Review.findByIdAndDelete(reviewId);
            return res.json({ success: true, message: 'Review deleted successfully' });
        } else if (action === 'keep') {
            review.report.status = 'Resolved';
            await review.save();
            return res.json({ success: true, message: 'Review kept successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }
    } catch (error) {
        console.error('Error resolving reported review:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};