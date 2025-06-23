const Offer = require("../../../models/admin/OfferModel");
const Product = require("../../../models/admin/ProductModel");

const applyOfferDiscount = (product, discountType, discountValue) => {
  let discountAmount = 0;
  if (discountType === "percentage") {
    discountAmount = product.price * (discountValue / 100);
  } else if (discountType === "fixed") {
    discountAmount = discountValue;
  }
  return Math.max(product.price - discountAmount, 0);
};

// Helper: Check if an offer is valid.
const isOfferValid = (offer) => {
  const now = new Date();
  if (offer.status !== "active") return false;
  if (offer.validFrom && now < new Date(offer.validFrom)) return false;
  if (offer.validTo && now > new Date(offer.validTo)) return false;
  return true;
};

// Create a new offer and apply it (overriding any active deal).

exports.createOffer = async (req, res) => {
  const { name, description, discountType, discountValue, targetType, target, validFrom, validTo } = req.body;
  
  if (!name || !discountType || !discountValue || !targetType || !target) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  try {
    const newOffer = new Offer({
      name,
      description,
      discountType,
      discountValue,
      targetType,
      target,
      validFrom,
      validTo,
      ownerType: req.user.role,
      ownerId: req.user.id
    });
    await newOffer.save();

    // Apply offer if valid now.
    if (isOfferValid(newOffer)) {
      let affectedProducts = [];
      if (targetType === "Product") {
        const productIds = Array.isArray(target) ? target : [target];
        affectedProducts = await Product.find({ _id: { $in: productIds } });
      } else if (targetType === "Category") {
        affectedProducts = await Product.find({ category: target });
      } else if (targetType === "SubCategory") {
        affectedProducts = await Product.find({ subcategory: target });
      }
      
      // For each affected product, override any active deal.
      for (let product of affectedProducts) {
        product.finalPrice = applyOfferDiscount(product, discountType, discountValue);
        product.offer = newOffer._id;
        product.deal = null; // Clear active deal.
        await product.save();
      }
    }
    
    res.status(201).json({ message: "Offer created and applied successfully", offer: newOffer });
  } catch (error) {
    res.status(500).json({ message: "Error creating offer", error: error.message });
  }
};

// Get all offers.
exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching offers", error: error.message });
  }
};

// Get an offer by ID.
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: "Error fetching offer", error: error.message });
  }
};

// Update an offer and reapply or revert discount.
exports.updateOffer = async (req, res) => {
  const { id } = req.params;
  const { name, description, discountType, discountValue, validFrom, validTo, status } = req.body;
  
  try {
    const offer = await Offer.findById(id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    
    if (name) offer.name = name;
    if (description) offer.description = description;
    if (discountType) offer.discountType = discountType;
    if (discountValue) offer.discountValue = discountValue;
    if (validFrom) offer.validFrom = validFrom;
    if (validTo) offer.validTo = validTo;
    if (status) offer.status = status;
    
    await offer.save();
    
    // Reapply or revert discount on affected products.
    let affectedProducts = [];
    if (offer.targetType === "Product") {
      const productIds = Array.isArray(offer.target) ? offer.target : [offer.target];
      affectedProducts = await Product.find({ _id: { $in: productIds } });
    } else if (offer.targetType === "Category") {
      affectedProducts = await Product.find({ category: offer.target });
    } else if (offer.targetType === "SubCategory") {
      affectedProducts = await Product.find({ subcategory: offer.target });
    }
    
    if (isOfferValid(offer)) {
      for (let product of affectedProducts) {
        product.finalPrice = applyOfferDiscount(product, offer.discountType, offer.discountValue);
        product.offer = offer._id;
        product.deal = null;
        await product.save();
      }
    } else {
      for (let product of affectedProducts) {
        if (product.offer && product.offer.toString() === offer._id.toString()) {
          product.finalPrice = product.price;
          product.offer = null;
          await product.save();
        }
      }
    }
    
    res.status(200).json({ message: "Offer updated successfully", offer });
  } catch (error) {
    res.status(500).json({ message: "Error updating offer", error: error.message });
  }
};

// Delete an offer and revert pricing on affected products.
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    
    let affectedProducts = [];
    if (offer.targetType === "Product") {
      const productIds = Array.isArray(offer.target) ? offer.target : [offer.target];
      affectedProducts = await Product.find({ _id: { $in: productIds }, offer: offer._id });
    } else if (offer.targetType === "Category") {
      affectedProducts = await Product.find({ category: offer.target, offer: offer._id });
    } else if (offer.targetType === "SubCategory") {
      affectedProducts = await Product.find({ subcategory: offer.target, offer: offer._id });
    }
    
    for (let product of affectedProducts) {
      product.finalPrice = product.price;
      product.offer = null;
      await product.save();
    }
    
    await Offer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting offer", error: error.message });
  }
};
