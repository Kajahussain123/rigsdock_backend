const axios = require('axios');
const Token = require('../models/admin/ZohoTokenModel');
const {refreshTokens} = require('../controllers/Admin/Invoice/invoiceController');

exports.refreshTokenIfExpired = async (req, res, next) => {
    const tokens = await Token.findOne().sort({ createdAt: -1 }); // Get the latest tokens
    if (!tokens) {
        return res.status(401).json({ error: 'No tokens found' });
    }

    try {
        // Make a test API call to check if the token is valid
        await axios.get('https://invoice.zoho.in/api/v3/settings/currencies', {
            headers: {
                'X-com-zoho-invoice-organizationid': '60038864380',
                'Authorization': `Zoho-oauthtoken ${tokens.accessToken}`
            }
        });
        next(); // Token is valid, proceed to the next middleware/route
    } catch (error) {
        if (error.response?.status === 401 && error.response?.data?.code === 9027) {
            console.log('Access token expired. Refreshing token...');
            await refreshTokens(); // Refresh the token
            next(); // Proceed to the next middleware/route
        } else {
            console.error('Error validating token:', error.response?.data || error.message);
            res.status(500).json({ error: 'Failed to validate token', details: error.response?.data || error.message });
        }
    }
};