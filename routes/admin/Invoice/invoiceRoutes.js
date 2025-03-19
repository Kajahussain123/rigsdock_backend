const express = require('express');
const router = express.Router();
const invoiceController = require('../../../controllers/Admin/Invoice/invoiceController');
const { refreshTokenIfExpired } = require('../../../middleware/refreshTokenIfExpired');

// zoho callback
router.get('/zoho-callback', invoiceController.zohoCallBack);

router.get('/get',invoiceController.getAllTokens);

router.get('/create-invoice',refreshTokenIfExpired,invoiceController.createInvoice);

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