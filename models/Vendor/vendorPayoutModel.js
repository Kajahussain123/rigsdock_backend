const mongoose = require('mongoose');

const VendorPayoutSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    totalSales: { type: Number, default: 0 },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    payoutDate: { type: Date },
    paymentStatus: { type: String, enum: ['Pending','Paid'], default: 'Pending' }
});

const VendorPayout = mongoose.model('VendorPayout',VendorPayoutSchema);
module.exports = VendorPayout;