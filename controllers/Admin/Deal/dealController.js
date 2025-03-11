const Deal = require("../../../models/admin/DealModel");
const Product = require("../../../models/admin/ProductModel");

// Helper: Calculate discounted price based on discount type and value.
const applyDealDiscount = (product, discountType, discountValue) => {
  let discountAmount = 0;
  if (discountType === "percentage") {
    discountAmount = product.price * (discountValue / 100);
  } else if (discountType === "fixed") {
    discountAmount = discountValue;
  }
  return Math.max(product.price - discountAmount, 0);
};

// Helper: Check if a deal is active (based on current datetime).
const isDealActive = (deal) => {
  const now = new Date();
  return (
    deal.status === "active" &&
    now >= new Date(deal.startDateTime) &&
    now <= new Date(deal.endDateTime)
  );
};

// Helper: Check if a product already has an active deal (other than a given one).
const productHasActiveDeal = async (product, currentDealId = null) => {
  if (!product.deal) return false;
  const existingDeal = await Deal.findById(product.deal);
  if (!existingDeal) return false;
  if (currentDealId && product.deal.toString() === currentDealId.toString()) return false;
  return isDealActive(existingDeal);
};

// Create a new deal and apply it to affected products (override existing offer).
exports.createDeal = async (req, res) => {
  const { title, description, discountType, discountValue, targetType, target, startDateTime, endDateTime } = req.body;
  
  if (!title || !discountType || !discountValue || !targetType || !target || !startDateTime || !endDateTime) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  // Validate discount values.
  if (discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
    return res.status(400).json({ message: "For percentage discount, discountValue must be between 1 and 100" });
  }
  if (discountType === "fixed" && discountValue <= 0) {
    return res.status(400).json({ message: "For fixed discount, discountValue must be greater than 0" });
  }
  
  try {
    // Create the new deal.
    const newDeal = new Deal({
      title,
      description,
      discountType,
      discountValue,
      targetType,
      target,
      startDateTime,
      endDateTime,
      status: "active"
    });
    await newDeal.save();
    
    // Determine affected products.
    let affectedProducts = [];
    if (targetType === "Product") {
      const productIds = Array.isArray(target) ? target : [target];
      affectedProducts = await Product.find({ _id: { $in: productIds } });
    } else if (targetType === "Category") {
      affectedProducts = await Product.find({ category: target });
    } else if (targetType === "SubCategory") {
      affectedProducts = await Product.find({ subcategory: target });
    }
    
    // Enforce single active deal: override any existing active offer.
    for (let product of affectedProducts) {
      if (await productHasActiveDeal(product)) {
        return res.status(400).json({ message: `Product ${product._id} already has an active deal` });
      }
    }
    
    // Apply deal discount if active.
    if (isDealActive(newDeal)) {
      for (let product of affectedProducts) {
        product.finalPrice = applyDealDiscount(product, discountType, discountValue);
        product.deal = newDeal._id;
        product.offer = null; // Clear any active offer.
        await product.save();
      }
    }
    
    res.status(201).json({ message: "Deal created and applied successfully", deal: newDeal });
  } catch (error) {
    res.status(500).json({ message: "Error creating deal", error: error.message });
  }
};

// Get all deals.
exports.getDeals = async (req, res) => {
  try {
    const deals = await Deal.find().sort({ createdAt: -1 });
    res.status(200).json(deals);
  } catch (error) {
    res.status(500).json({ message: "Error fetching deals", error: error.message });
  }
};

// Get a deal by ID.
exports.getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id).populate("products", "name price");
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.status(200).json(deal);
  } catch (error) {
    res.status(500).json({ message: "Error fetching deal", error: error.message });
  }
};

// Update a deal and reapply or revert discount.
exports.updateDeal = async (req, res) => {
  const { id } = req.params;
  const { title, description, discountType, discountValue, targetType, target, startDateTime, endDateTime, status } = req.body;
  
  try {
    const deal = await Deal.findById(id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    
    if (title) deal.title = title;
    if (description) deal.description = description;
    if (discountType) {
      if (!["percentage", "fixed"].includes(discountType)) {
        return res.status(400).json({ message: "Invalid discount type" });
      }
      deal.discountType = discountType;
    }
    if (discountValue) {
      if (deal.discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
        return res.status(400).json({ message: "For percentage discount, discountValue must be between 1 and 100" });
      }
      if (deal.discountType === "fixed" && discountValue <= 0) {
        return res.status(400).json({ message: "For fixed discount, discountValue must be greater than 0" });
      }
      deal.discountValue = discountValue;
    }
    if (targetType) deal.targetType = targetType;
    if (target) deal.target = target;
    if (startDateTime) deal.startDateTime = startDateTime;
    if (endDateTime) deal.endDateTime = endDateTime;
    if (status) deal.status = status;
    
    await deal.save();
    
    // Fetch affected products.
    let affectedProducts = [];
    if (deal.targetType === "Product") {
      const productIds = Array.isArray(deal.target) ? deal.target : [deal.target];
      affectedProducts = await Product.find({ _id: { $in: productIds } });
    } else if (deal.targetType === "Category") {
      affectedProducts = await Product.find({ category: deal.target });
    } else if (deal.targetType === "SubCategory") {
      affectedProducts = await Product.find({ subcategory: deal.target });
    }
    
    // Reapply or revert discount based on active status.
    if (isDealActive(deal)) {
      for (let product of affectedProducts) {
        // Ensure no other active deal is applied.
        if (await productHasActiveDeal(product, deal._id)) {
          return res.status(400).json({ message: `Product ${product._id} already has another active deal` });
        }
        product.finalPrice = applyDealDiscount(product, deal.discountType, deal.discountValue);
        product.deal = deal._id;
        product.offer = null;
        await product.save();
      }
    } else {
      for (let product of affectedProducts) {
        if (product.deal && product.deal.toString() === deal._id.toString()) {
          product.finalPrice = product.price;
          product.deal = null;
          await product.save();
        }
      }
    }
    
    res.status(200).json({ message: "Deal updated successfully", deal });
  } catch (error) {
    res.status(500).json({ message: "Error updating deal", error: error.message });
  }
};

// Delete a deal and revert pricing on affected products.
exports.deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    
    let affectedProducts = [];
    if (deal.targetType === "Product") {
      const productIds = Array.isArray(deal.target) ? deal.target : [deal.target];
      affectedProducts = await Product.find({ _id: { $in: productIds }, deal: deal._id });
    } else if (deal.targetType === "Category") {
      affectedProducts = await Product.find({ category: deal.target, deal: deal._id });
    } else if (deal.targetType === "SubCategory") {
      affectedProducts = await Product.find({ subcategory: deal.target, deal: deal._id });
    }
    
    for (let product of affectedProducts) {
      product.finalPrice = product.price;
      product.deal = null;
      await product.save();
    }
    
    await Deal.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deal deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting deal", error: error.message });
  }
};
