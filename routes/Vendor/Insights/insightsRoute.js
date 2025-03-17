const express = require('express');
const router = express.Router();
const insightsController = require('../../../controllers/Vendor/Insights/insightsController');
const verifyToken = require('../../../middleware/jwt');

// fetch customer feedback insights
router.get('/customer-feedback-insights',verifyToken(['Vendor']),insightsController.getCustomerFeedbackInsights);

module.exports = router;