const express = require('express');
const router = express.Router();
const invoiceController = require('../../../controllers/Admin/Invoice/invoiceController');
const { refreshTokenIfExpired } = require('../../../middleware/refreshTokenIfExpired');

// zoho callback
router.get('/zoho-callback', invoiceController.zohoCallBack);

router.get('/get',invoiceController.getAllTokens);

router.post('/create-invoice',refreshTokenIfExpired,invoiceController.createInvoice);

router.post('/revoke',invoiceController.revokeToken);

// // get invoice
// router.get('/get', jwtVerify(['admin']),invoiceController.getInvoices);

// // update
// router.patch('/update/:id', jwtVerify(['admin']), invoiceController.updateInvoice);

// // delete
// router.delete('/delete/:id',  jwtVerify(['admin']),invoiceController.deleteInvoice);


// // Fetch invoices with search
// router.get('/search', /*  jwtVerify(['admin']) ,*/invoiceController.searchInvoices);

// // Filter route
// router.get('/filter', invoiceController.filterInvoices);


module.exports = router;