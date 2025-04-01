const DealOfTheDay = require('../../../models/Vendor/DealofthedayModel');
const Product = require('../../../models/admin/ProductModel');

// create deal of the day
exports.addDealOfTheDay = async(req,res) => { 
    try {
        const { productId,offerPrice } = req.body;
        const existingVendor = await DealOfTheDay.findOne({ vendor: req.user.id, status: "active" });
        if(existingVendor) {
            return res.status(404).json({ message: "You already have an active deal" })
        }

        const product = await Product.findById(productId);
        if(!product) {
            return res.status(404).json({ message: "Product not found" })
        }
        console.log('product:',product)

        // // Check if the product already has a deal
        // const existingDeal = await DealOfTheDay.findOne({ product: productId });
        // if(existingDeal) {
        //     return res.status(400).json({ message: "This product already has a deal" })
        // }

        // Update the product's finalPrice
        product.finalPrice = product.finalPrice - offerPrice;
        await product.save();

        // Create a new deal
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        const deal = new DealOfTheDay({
            product: productId,
            offerPrice,
            vendor: req.user.id,
            status: "active",
            expiresAt,
        });

        await deal.save();

        res.status(201).json({ message: "Deal of the Day added successfully", deal });
    } catch (error) {
        console.error("Error adding deal:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

exports.deleteDealOfTheDay = async (req, res) => {
  try {
    const { dealId } = req.params;

    // Find the deal
    const deal = await DealOfTheDay.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    // Revert the product's finalPrice
    const product = await Product.findById(deal.product);
    if (product) {
      product.finalPrice = product.price; // Revert to original price
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

// get all deals
exports.getAllDeals = async(req,res) => {
    try {
        const deals = await DealOfTheDay.find({ vendor: req.user.id });
        // // Add remaining time to each deal
        // const dealsWithCountdown = deals.map(deal => {
        //     const currentTime = new Date();
        //     const expiresAt = new Date(deal.expiresAt);
        //     const remainingTime = expiresAt - currentTime; // Time difference in milliseconds

        //     return {
        //         ...deal.toObject(), // Convert Mongoose document to plain object
        //         remainingTime: remainingTime > 0 ? remainingTime : 0, // Ensure remaining time is not negative
        //     };
        // });
        res.status(200).json(deals);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// exports.updateDealOfTheDay = async (req, res) => {
//   try {
//     const { dealId } = req.params;
//     const { offerPrice } = req.body;

//     // Find the deal
//     const deal = await DealOfTheDay.findById(dealId);
//     if (!deal) {
//       return res.status(404).json({ message: "Deal not found" });
//     }

//     // Update the product's finalPrice
//     const product = await Product.findById(deal.product);
//     if (product) {
//       product.finalPrice = offerPrice;
//       await product.save();
//     }

//     // Update the deal
//     deal.offerPrice = offerPrice;
//     await deal.save();

//     res.status(200).json({ message: "Deal updated successfully", deal });
//   } catch (error) {
//     console.error("Error updating deal:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };