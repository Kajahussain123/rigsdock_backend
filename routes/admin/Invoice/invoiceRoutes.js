const express = require('express');
const router = express.Router();
const invoiceController = require('../../../controllers/Admin/Invoice/invoiceController');
const { refreshTokenIfExpired } = require('../../../middleware/refreshTokenIfExpired');

// Auth routes
router.get('/zoho-auth',invoiceController.initiateZohoAuth);
router.get('/zoho-callback',invoiceController.zohoCallBack);

// Token management
router.get('/tokens',invoiceController.getAllTokens);
router.post('/revoke-token',invoiceController.revokeToken);

// Invoice operations
router.post('/create-invoice',invoiceController.createInvoice);
router.get('/customers',invoiceController.getCustomers);


module.exports = router;