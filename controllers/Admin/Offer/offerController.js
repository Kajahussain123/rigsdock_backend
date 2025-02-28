const Offer = require("../../../models/admin/OfferModel");
const Product = require("../../../models/admin/ProductModel");

// Helper function: Check if the offer is valid (active and within valid dates)
const isOfferValid = (offer) => {
  const now = new Date();
  if (offer.status !== "active") return false;
  if (offer.validFrom && now < new Date(offer.validFrom)) return false;
  if (offer.validTo && now > new Date(offer.validTo)) return false;
  return true;
};

// Helper function: Calculate discounted price
const applyDiscount = (product, discountType, discountValue) => {
  let discountAmount = 0;
  if (discountType === "percentage") {
    discountAmount = product.price * (discountValue / 100);
  } else if (discountType === "fixed") {
    discountAmount = discountValue;
  }
  return Math.max(product.price - discountAmount, 0);
};

// Create a new offer and apply it to affected products
exports.createOffer = async (req, res) => {
  const {
    name,
    description,
    discountType,
    discountValue,
    targetType,
    target,
    validFrom,
    validTo
  } = req.body;
  
  // Validate required fields
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
      target, // When targetType is "Product", this can be an array or a single ID.
      validFrom,
      validTo
    });
    await newOffer.save();

    // Apply the offer to products if the offer is valid now
    if (isOfferValid(newOffer)) {
      if (targetType === "Product") {
        const productIds = Array.isArray(target) ? target : [target];
        const products = await Product.find({ _id: { $in: productIds } });
        for (let product of products) {
          product.finalPrice = applyDiscount(product, discountType, discountValue);
          product.offer = newOffer._id;
          await product.save();
        }
      } else if (targetType === "Category") {
        const products = await Product.find({ category: target });
        for (let product of products) {
          product.finalPrice = applyDiscount(product, discountType, discountValue);
          product.offer = newOffer._id;
          await product.save();
        }
      } else if (targetType === "SubCategory") {
        const products = await Product.find({ subcategory: target });
        for (let product of products) {
          product.finalPrice = applyDiscount(product, discountType, discountValue);
          product.offer = newOffer._id;
          await product.save();
        }
      }
    }
    
    res.status(201).json({ message: "Offer created and applied successfully", offer: newOffer });
  } catch (error) {
    res.status(500).json({ message: "Error creating offer", error: error.message });
  }
};

// Get all offers (sorted by creation date, newest first)
exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching offers", error: error.message });
  }
};

// Get a specific offer by ID
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: "Error fetching offer", error: error.message });
  }
};

// Update an offer and reapply or revert discount to affected products
exports.updateOffer = async (req, res) => {
  const { id } = req.params;
  const { name, description, discountType, discountValue, validFrom, validTo, status } = req.body;
  
  try {
    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    
    if (name) offer.name = name;
    if (description) offer.description = description;
    if (discountType) offer.discountType = discountType;
    if (discountValue) offer.discountValue = discountValue;
    if (validFrom) offer.validFrom = validFrom;
    if (validTo) offer.validTo = validTo;
    if (status) offer.status = status;
    
    await offer.save();

    // Reapply the offer if it remains valid; otherwise revert affected products to normal pricing.
    if (isOfferValid(offer)) {
      if (offer.targetType === "Product") {
        const productIds = Array.isArray(offer.target) ? offer.target : [offer.target];
        const products = await Product.find({ _id: { $in: productIds } });
        for (let product of products) {
          product.finalPrice = applyDiscount(product, offer.discountType, offer.discountValue);
          product.offer = offer._id;
          await product.save();
        }
      } else if (offer.targetType === "Category") {
        const products = await Product.find({ category: offer.target });
        for (let product of products) {
          product.finalPrice = applyDiscount(product, offer.discountType, offer.discountValue);
          product.offer = offer._id;
          await product.save();
        }
      } else if (offer.targetType === "SubCategory") {
        const products = await Product.find({ subcategory: offer.target });
        for (let product of products) {
          product.finalPrice = applyDiscount(product, offer.discountType, offer.discountValue);
          product.offer = offer._id;
          await product.save();
        }
      }
    } else {
      // If the offer is no longer valid, revert affected products to their original price.
      if (offer.targetType === "Product") {
        const productIds = Array.isArray(offer.target) ? offer.target : [offer.target];
        const products = await Product.find({ _id: { $in: productIds }, offer: offer._id });
        for (let product of products) {
          product.finalPrice = product.price;
          product.offer = null;
          await product.save();
        }
      } else if (offer.targetType === "Category") {
        const products = await Product.find({ category: offer.target, offer: offer._id });
        for (let product of products) {
          product.finalPrice = product.price;
          product.offer = null;
          await product.save();
        }
      } else if (offer.targetType === "SubCategory") {
        const products = await Product.find({ subcategory: offer.target, offer: offer._id });
        for (let product of products) {
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

// Delete an offer and revert pricing on affected products
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    
    // Revert pricing for affected products
    if (offer.targetType === "Product") {
      const productIds = Array.isArray(offer.target) ? offer.target : [offer.target];
      const products = await Product.find({ _id: { $in: productIds }, offer: offer._id });
      for (let product of products) {
        product.finalPrice = product.price;
        product.offer = null;
        await product.save();
      }
    } else if (offer.targetType === "Category") {
      const products = await Product.find({ category: offer.target, offer: offer._id });
      for (let product of products) {
        product.finalPrice = product.price;
        product.offer = null;
        await product.save();
      }
    } else if (offer.targetType === "SubCategory") {
      const products = await Product.find({ subcategory: offer.target, offer: offer._id });
      for (let product of products) {
        product.finalPrice = product.price;
        product.offer = null;
        await product.save();
      }
    }
    
    await Offer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting offer", error: error.message });
  }
};
