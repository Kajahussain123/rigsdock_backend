const Offer = require("../../../models/admin/HomeOfferModel");
const Product = require("../../../models/admin/ProductModel");
const fs = require('fs');
const path = require('path');

const applyOfferDiscount = (product, discountType, discountValue) => {
  let discountAmount = 0;
  if (discountType === "percentage") {
    discountAmount = product.price * (discountValue / 100);
  } else if (discountType === "fixed") {
    discountAmount = discountValue;
  }
  return Math.max(product.price - discountAmount, 0);
};

// Helper: Check if an offer is valid
const isOfferValid = (offer) => {
  const now = new Date();
  if (offer.status !== "active") return false;
  if (offer.validFrom && now < new Date(offer.validFrom)) return false;
  if (offer.validTo && now > new Date(offer.validTo)) return false;
  return true;
};

// Helper: Delete image file
const deleteImageFile = (imagePath) => {
  if (imagePath && fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
};

// Create a new home offer
exports.createHomeOffer = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      discountType, 
      discountValue, 
      targetType, 
      target, 
      validFrom, 
      validTo,
      productIds,
      termsAndConditions
    } = req.body;
    
    // Validation
    if (!name || !discountType || !discountValue || !targetType) {
      if (req.file) deleteImageFile(req.file.path);
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: name, discountType, discountValue, targetType" 
      });
    }

    // Parse productIds if provided
    let parsedProductIds = [];
    if (productIds) {
      try {
        parsedProductIds = JSON.parse(productIds);
        if (!Array.isArray(parsedProductIds)) {
          if (req.file) deleteImageFile(req.file.path);
          return res.status(400).json({ 
            success: false,
            message: "productIds must be an array" 
          });
        }
      } catch (error) {
        if (req.file) deleteImageFile(req.file.path);
        return res.status(400).json({ 
          success: false,
          message: "Invalid productIds format" 
        });
      }
    }

    // Create new offer
    const newOffer = new Offer({
      name,
      description,
      discountType,
      discountValue,
      targetType,
      target,
      validFrom,
      validTo,
      image: req.file ? req.file.path : null,
      productIds: parsedProductIds,
      termsAndConditions,
      ownerType: "admin",
      ownerId: req.user.id
    });
    
    await newOffer.save();

    // Apply offer if valid now
    if (isOfferValid(newOffer)) {
      let affectedProducts = [];
      
      // If specific product IDs are provided, use them
      if (newOffer.productIds && newOffer.productIds.length > 0) {
        affectedProducts = await Product.find({ _id: { $in: newOffer.productIds } });
      } else {
        // Otherwise use the target logic
        if (targetType === "Product") {
          const productIdArray = Array.isArray(target) ? target : [target];
          affectedProducts = await Product.find({ _id: { $in: productIdArray } });
        } else if (targetType === "Category") {
          affectedProducts = await Product.find({ category: target });
        } else if (targetType === "SubCategory") {
          affectedProducts = await Product.find({ subcategory: target });
        } else if (targetType === "All") {
          affectedProducts = await Product.find({});
        }
      }
      
      // Apply discount to affected products
      for (let product of affectedProducts) {
        product.finalPrice = applyOfferDiscount(product, discountType, discountValue);
        product.offer = newOffer._id;
        product.deal = null; // Clear active deal
        await product.save();
      }
    }
    
    res.status(201).json({ 
      success: true,
      message: "Home offer created and applied successfully", 
      data: newOffer 
    });
  } catch (error) {
    if (req.file) deleteImageFile(req.file.path);
    res.status(500).json({ 
      success: false,
      message: "Error creating home offer", 
      error: error.message 
    });
  }
};

// Get all home offers
exports.getAllHomeOffers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, targetType } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (targetType) query.targetType = targetType;
    
    const offers = await Offer.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('productIds', 'name price image category subcategory');
      
    const total = await Offer.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: "Home offers retrieved successfully",
      data: offers,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error fetching home offers", 
      error: error.message 
    });
  }
};

// Get home offer by ID
exports.getHomeOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('productIds', 'name price image category subcategory');
      
    if (!offer) {
      return res.status(404).json({ 
        success: false,
        message: "Home offer not found" 
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Home offer retrieved successfully",
      data: offer
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error fetching home offer", 
      error: error.message 
    });
  }
};

// Update home offer
exports.updateHomeOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      discountType, 
      discountValue, 
      validFrom, 
      validTo, 
      status,
      productIds,
      termsAndConditions
    } = req.body;
    
    const offer = await Offer.findById(id);
    if (!offer) {
      if (req.file) deleteImageFile(req.file.path);
      return res.status(404).json({ 
        success: false,
        message: "Home offer not found" 
      });
    }
    
    // Store old image path for deletion if new image is uploaded
    const oldImagePath = offer.image;
    
    // Update offer fields
    if (name) offer.name = name;
    if (description) offer.description = description;
    if (discountType) offer.discountType = discountType;
    if (discountValue) offer.discountValue = discountValue;
    if (validFrom) offer.validFrom = validFrom;
    if (validTo) offer.validTo = validTo;
    if (status) offer.status = status;
    if (termsAndConditions) offer.termsAndConditions = termsAndConditions;
    
    // Update productIds if provided
    if (productIds) {
      try {
        offer.productIds = JSON.parse(productIds);
      } catch (error) {
        if (req.file) deleteImageFile(req.file.path);
        return res.status(400).json({ 
          success: false,
          message: "Invalid productIds format" 
        });
      }
    }
    
    // Update image if new one is uploaded
    if (req.file) {
      offer.image = req.file.path;
      // Delete old image
      if (oldImagePath) deleteImageFile(oldImagePath);
    }
    
    await offer.save();
    
    // Reapply or revert discount on affected products
    let affectedProducts = [];
    
    // Get products based on productIds or target criteria
    if (offer.productIds && offer.productIds.length > 0) {
      affectedProducts = await Product.find({ _id: { $in: offer.productIds } });
    } else {
      if (offer.targetType === "Product") {
        const productIdArray = Array.isArray(offer.target) ? offer.target : [offer.target];
        affectedProducts = await Product.find({ _id: { $in: productIdArray } });
      } else if (offer.targetType === "Category") {
        affectedProducts = await Product.find({ category: offer.target });
      } else if (offer.targetType === "SubCategory") {
        affectedProducts = await Product.find({ subcategory: offer.target });
      } else if (offer.targetType === "All") {
        affectedProducts = await Product.find({});
      }
    }
    
    // Apply or remove discount based on offer validity
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
    
    res.status(200).json({ 
      success: true,
      message: "Home offer updated successfully", 
      data: offer 
    });
  } catch (error) {
    if (req.file) deleteImageFile(req.file.path);
    res.status(500).json({ 
      success: false,
      message: "Error updating home offer", 
      error: error.message 
    });
  }
};

// Delete home offer
exports.deleteHomeOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ 
        success: false,
        message: "Home offer not found" 
      });
    }
    
    let affectedProducts = [];
    
    // Get affected products based on productIds or target criteria
    if (offer.productIds && offer.productIds.length > 0) {
      affectedProducts = await Product.find({ 
        _id: { $in: offer.productIds }, 
        offer: offer._id 
      });
    } else {
      if (offer.targetType === "Product") {
        const productIdArray = Array.isArray(offer.target) ? offer.target : [offer.target];
        affectedProducts = await Product.find({ _id: { $in: productIdArray }, offer: offer._id });
      } else if (offer.targetType === "Category") {
        affectedProducts = await Product.find({ category: offer.target, offer: offer._id });
      } else if (offer.targetType === "SubCategory") {
        affectedProducts = await Product.find({ subcategory: offer.target, offer: offer._id });
      } else if (offer.targetType === "All") {
        affectedProducts = await Product.find({ offer: offer._id });
      }
    }
    
    // Revert pricing on affected products
    for (let product of affectedProducts) {
      product.finalPrice = product.price;
      product.offer = null;
      await product.save();
    }
    
    // Delete image file if exists
    if (offer.image) {
      deleteImageFile(offer.image);
    }
    
    await Offer.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ 
      success: true,
      message: "Home offer deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error deleting home offer", 
      error: error.message 
    });
  }
};

// Get active home offers for display
exports.getActiveHomeOffers = async (req, res) => {
  try {
    const now = new Date();
    const activeOffers = await Offer.find({
      status: 'active',
      $and: [
        { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
        { $or: [{ validTo: { $exists: false } }, { validTo: { $gte: now } }] }
      ]
    })
    .populate('productIds', 'name price image category subcategory')
    .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: "Active home offers retrieved successfully",
      data: activeOffers
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error fetching active home offers", 
      error: error.message 
    });
  }
};