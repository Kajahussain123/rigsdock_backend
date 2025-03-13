const VendorPayout = require('../../../models/Vendor/vendorPayoutModel');
const Order = require('../../../models/User/OrderModel');

exports.calculateVendorSales = async () => {
    try {
      // Fetch all orders from the current day
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0); // Start of the day (midnight)
  
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999); // End of the day
  
      const orders = await Order.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).populate("items.product", "owner finalPrice"); // Populate product details

      // Fetch all existing VendorPayout documents for today
      const existingPayouts = await VendorPayout.find();

      // Create a map of vendorId -> existing orderIds for quick lookup
      const existingOrderIdsMap = new Map();
      for (const payout of existingPayouts) {
        const vendorId = payout.vendorId.toString();
        if (!existingOrderIdsMap.has(vendorId)) {
          existingOrderIdsMap.set(vendorId, new Set());
        }
        // Add order IDs from all payouts (both Paid and Pending)
        payout.orderIds.forEach((id) => existingOrderIdsMap.get(vendorId).add(id.toString()));
      }
  
      // Group orders by vendor and calculate total sales
      const vendorSalesMap = new Map(); // Map to store vendorId -> { totalSales, orderIds }
  
      for (const order of orders) {
        for (const item of order.items) {
        //   const vendorId = item.product.owner;
            const vendorId = item.product.owner.toString();
            const orderId = order._id.toString();

            if (existingOrderIdsMap.has(vendorId)) {
                const existingOrderIds = existingOrderIdsMap.get(vendorId);
                if (existingOrderIds.has(orderId)) {
                    // Skip this order as it's already processed
                    continue;
                }
            }
            
          const amount = item.product.finalPrice * item.quantity;
  
          if (vendorSalesMap.has(vendorId)) {
            const vendorData = vendorSalesMap.get(vendorId);
            vendorData.totalSales += amount;
            vendorData.orderIds.push(orderId);
            // if (!vendorData.orderIds.includes(order._id)) {
            //     vendorData.orderIds.push(order._id); // Avoid duplicate order IDs in memory
            //   }
          } else {
            vendorSalesMap.set(vendorId, {
              totalSales: amount,
              orderIds: [orderId],
            });
          }
        }
      }
  
      // Update or create VendorPayout documents
      for (const [vendorId, data] of vendorSalesMap.entries()) {
        // Check if the vendor has a payout with status "Paid"
        const paidPayout = await VendorPayout.findOne({ vendorId: vendorId,paymentStatus: "Paid"});
        if(paidPayout){
            await VendorPayout.create({ 
                vendorId: vendorId,
                totalSales: data.totalSales,
                orderIds: data.orderIds,
                paymentStatus: "Pending",
             })
        } else {
            await VendorPayout.findOneAndUpdate(
                { vendorId: vendorId, paymentStatus: "Pending" },
                {
                    $inc: { totalSales: data.totalSales }, // Increment totalSales
                    $addToSet: { orderIds: { $each: data.orderIds } }, // Add order IDs (avoid duplicates)
                },
                { upsert: true, new: true } // Create if not exists
            );
        }
      }
  
      console.log("Vendor sales calculated and updated successfully.");
    } catch (error) {
      console.error("Error calculating vendor sales:", error);
    }
  };
  
exports.markPayoutAsPaid = async (req,res) => {
    const { vendorPayoutId } = req.params;
    const { paymentStatus } = req.body;
  try {
    // Find the pending payout for the vendor
    const payout = await VendorPayout.findOne({ _id: vendorPayoutId, paymentStatus: 'Pending' });

    if (!payout) {
      return res.status(400).json({ message: 'No pending payout found for the vendor.' })
    }

    // Update the payout status, set payoutDate, and reset totalSales
    payout.paymentStatus = paymentStatus;
    payout.payoutDate = new Date();
    await payout.save();

    res.status(200).json({ message: "Payout marked as paid successfully",payout })
  } catch (error) {
    console.error('Error marking payout as paid:', error);
    res.status(500).json({ message: 'Error updating vendor payoutstatus', error: error.message });
  }
};

// get all vendorpayout details
exports.getAllVendorPayouts = async(req,res) => {
    try {
        const vendorPayouts = await VendorPayout.find();
        res.status(200).json(vendorPayouts)
    } catch (error) {
        res.status(500).json({ message: 'Error updating vendor payoutstatus', error: error.message });
    }
}