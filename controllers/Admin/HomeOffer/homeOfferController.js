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

const isOfferValid = (offer) => {
  const now = new Date();
  if (offer.status !== "active") return false;
  if (offer.validFrom && now < new Date(offer.validFrom)) return false;
  if (offer.validTo && now > new Date(offer.validTo)) return false;
  return true;
};

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
      productIds,
      validFrom, 
      validTo,
      termsAndConditions
    } = req.body;
    
    // Validation
    if (!name || !discountType || !discountValue || !productIds) {
      if (req.file) deleteImageFile(req.file.path);
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: name, discountType, discountValue, productIds" 
      });
    }

    // Parse and validate productIds
    let parsedProductIds = [];
    try {
      parsedProductIds = JSON.parse(productIds);
      if (!Array.isArray(parsedProductIds) || parsedProductIds.length === 0) {
        if (req.file) deleteImageFile(req.file.path);
        return res.status(400).json({ 
          success: false,
          message: "productIds must be a non-empty array" 
        });
      }
    } catch (error) {
      if (req.file) deleteImageFile(req.file.path);
      return res.status(400).json({ 
        success: false,
        message: "Invalid productIds format" 
      });
    }

    // Verify that all products exist
    const existingProducts = await Product.find({ _id: { $in: parsedProductIds } });
    if (existingProducts.length !== parsedProductIds.length) {
      if (req.file) deleteImageFile(req.file.path);
      return res.status(400).json({ 
        success: false,
        message: "One or more products not found" 
      });
    }

    // Create new offer
    const newOffer = new Offer({
      name,
      description,
      discountType,
      discountValue,
      productIds: parsedProductIds,
      validFrom,
      validTo,
      image: req.file ? req.file.path : null,
      termsAndConditions,
      ownerType: "admin",
      ownerId: req.user.id
    });
    
    await newOffer.save();

    // Apply offer discount to products if valid
    if (isOfferValid(newOffer)) {
      for (let product of existingProducts) {
        product.finalPrice = applyOfferDiscount(product, discountType, discountValue);
        product.offer = newOffer._id;
        product.deal = null; // Clear active deal
        await product.save();
      }
    }
    
    // Populate product data for response
    await newOffer.populate('productIds', 'name price finalPrice image category subcategory stock');
    
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

// Get all home offers with product data
exports.getAllHomeOffers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const offers = await Offer.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('productIds', 'name price finalPrice image category subcategory stock description');
      
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

// Get home offer by ID with product data
exports.getHomeOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('productIds', 'name price finalPrice image category subcategory stock description');
      
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
      productIds,
      validFrom, 
      validTo, 
      status,
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
    
    // Store old product IDs and image path
    const oldProductIds = [...offer.productIds];
    const oldImagePath = offer.image;
    
    // Update basic offer fields
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
        const parsedProductIds = JSON.parse(productIds);
        if (!Array.isArray(parsedProductIds) || parsedProductIds.length === 0) {
          if (req.file) deleteImageFile(req.file.path);
          return res.status(400).json({ 
            success: false,
            message: "productIds must be a non-empty array" 
          });
        }
        
        // Verify products exist
        const existingProducts = await Product.find({ _id: { $in: parsedProductIds } });
        if (existingProducts.length !== parsedProductIds.length) {
          if (req.file) deleteImageFile(req.file.path);
          return res.status(400).json({ 
            success: false,
            message: "One or more products not found" 
          });
        }
        
        offer.productIds = parsedProductIds;
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
      if (oldImagePath) deleteImageFile(oldImagePath);
    }
    
    await offer.save();
    
    // Remove discount from old products that are no longer in the offer
    const oldProducts = await Product.find({ 
      _id: { $in: oldProductIds }, 
      offer: offer._id 
    });
    
    for (let product of oldProducts) {
      if (!offer.productIds.includes(product._id)) {
        product.finalPrice = product.price;
        product.offer = null;
        await product.save();
      }
    }
    
    // Apply or update discount on current products
    const currentProducts = await Product.find({ _id: { $in: offer.productIds } });
    
    if (isOfferValid(offer)) {
      for (let product of currentProducts) {
        product.finalPrice = applyOfferDiscount(product, offer.discountType, offer.discountValue);
        product.offer = offer._id;
        product.deal = null;
        await product.save();
      }
    } else {
      // Remove discount if offer is no longer valid
      for (let product of currentProducts) {
        if (product.offer && product.offer.toString() === offer._id.toString()) {
          product.finalPrice = product.price;
          product.offer = null;
          await product.save();
        }
      }
    }
    
    // Populate product data for response
    await offer.populate('productIds', 'name price finalPrice image category subcategory stock');
    
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
    
    // Remove discount from all affected products
    const affectedProducts = await Product.find({ 
      _id: { $in: offer.productIds }, 
      offer: offer._id 
    });
    
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

exports.getActiveHomeOffers = async (req, res) => {
  try {
    const activeOffers = await Offer.findActiveHomeOffersWithProducts();
    
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

// Get offers for a specific product
exports.getOffersForProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const offers = await Offer.findActiveOffersForProduct(productId)
      .populate('productIds', 'name price finalPrice image category subcategory');
    
    res.status(200).json({
      success: true,
      message: "Product offers retrieved successfully",
      data: offers
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error fetching product offers", 
      error: error.message 
    });
  }
};