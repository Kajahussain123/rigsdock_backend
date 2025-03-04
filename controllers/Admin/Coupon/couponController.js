const Coupon = require("../../../models/admin/couponModel");
const Product = require("../../../models/admin/ProductModel");
const Category = require("../../../models/admin/categoryModel");
const SubCategory = require("../../../models/admin/SubCategoryModel");



const isCouponValid = (coupon, purchaseAmount = null, isFirstPurchase = true) => {
    const now = new Date();
    if (coupon.status !== "active") return false;
    if (coupon.validFrom && now < new Date(coupon.validFrom)) return false;
    if (coupon.validTo && now > new Date(coupon.validTo)) return false;
    if (purchaseAmount !== null && coupon.minPurchaseAmount && Number(purchaseAmount) < Number(coupon.minPurchaseAmount)) {
      return false;
    }
    // Check if the coupon is only valid on the first purchase
    if (coupon.firstPurchaseOnly && !isFirstPurchase) {
      return false;
    }
    return true;
  };
  
  
  // Create a new coupon with validations and rule checks
  exports.createCoupon = async (req, res) => {
    const {
      name,
      couponCode,
      discountType,
      discountValue,
      targetType,
      target,
      validFrom,
      validTo,
      usageLimit,
      minPurchaseAmount,
      firstPurchaseOnly
    } = req.body;
    
    // Check required fields
    if (!name || !couponCode || !discountType || !discountValue || !targetType || !target || !validFrom || !validTo) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    // Validate discount values
    if (discountType === "percentage") {
      if (discountValue <= 0 || discountValue > 100) {
        return res.status(400).json({ message: "For percentage discount, discountValue must be between 1 and 100" });
      }
    } else if (discountType === "fixed") {
      if (discountValue <= 0) {
        return res.status(400).json({ message: "For fixed discount, discountValue must be greater than 0" });
      }
    } else {
      return res.status(400).json({ message: "Invalid discount type" });
    }
    
    // Validate minPurchaseAmount (if provided)
    if (minPurchaseAmount !== undefined && (isNaN(minPurchaseAmount) || Number(minPurchaseAmount) < 0)) {
      return res.status(400).json({ message: "minPurchaseAmount must be a non-negative number" });
    }
    
    // Validate that the target exists based on targetType
    try {
      if (targetType === "Product") {
        const product = await Product.findById(target);
        if (!product) return res.status(400).json({ message: "Target product not found" });
      } else if (targetType === "Category") {
        const category = await Category.findById(target);
        if (!category) return res.status(400).json({ message: "Target category not found" });
      } else if (targetType === "SubCategory") {
        const subcategory = await SubCategory.findById(target);
        if (!subcategory) return res.status(400).json({ message: "Target subcategory not found" });
      } else if (targetType === "Brand") {
        if (typeof target !== "string" || !target.trim()) {
          return res.status(400).json({ message: "Target brand is invalid" });
        }
      } else {
        return res.status(400).json({ message: "Invalid target type" });
      }
    } catch (err) {
      return res.status(500).json({ message: "Error validating target", error: err.message });
    }
    
    try {
      const newCoupon = new Coupon({
        name,
        couponCode,
        discountType,
        discountValue,
        targetType,
        target,
        validFrom,
        validTo,
        usageLimit: usageLimit || 0,
        minPurchaseAmount: minPurchaseAmount || 0,
        firstPurchaseOnly: firstPurchaseOnly || false
      });
      await newCoupon.save();
      res.status(201).json({ message: "Coupon created successfully", coupon: newCoupon });
    } catch (error) {
      res.status(500).json({ message: "Error creating coupon", error: error.message });
    }
  };
  
  // Get all coupons
  exports.getCoupons = async (req, res) => {
    try {
      const coupons = await Coupon.find().sort({ createdAt: -1 });
      res.status(200).json(coupons);
    } catch (error) {
      res.status(500).json({ message: "Error fetching coupons", error: error.message });
    }
  };
  
  // Get a coupon by ID
  exports.getCouponById = async (req, res) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) return res.status(404).json({ message: "Coupon not found" });
      res.status(200).json(coupon);
    } catch (error) {
      res.status(500).json({ message: "Error fetching coupon", error: error.message });
    }
  };
  
 // Update a coupon with validations
exports.updateCoupon = async (req, res) => {
    const { id } = req.params;
    const {
      name,
      couponCode,
      discountType,
      discountValue,
      targetType,
      target,
      validFrom,
      validTo,
      status,
      usageLimit,
      minPurchaseAmount,
      firstPurchaseOnly // New field for first purchase condition
    } = req.body;
    
    try {
      const coupon = await Coupon.findById(id);
      if (!coupon) return res.status(404).json({ message: "Coupon not found" });
      
      if (name) coupon.name = name;
      if (couponCode) coupon.couponCode = couponCode;
      
      if (discountType) {
        if (!["percentage", "fixed"].includes(discountType)) {
          return res.status(400).json({ message: "Invalid discount type" });
        }
        coupon.discountType = discountType;
      }
      
      if (discountValue) {
        if (coupon.discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
          return res.status(400).json({ message: "For percentage discount, discountValue must be between 1 and 100" });
        }
        if (coupon.discountType === "fixed" && discountValue <= 0) {
          return res.status(400).json({ message: "For fixed discount, discountValue must be greater than 0" });
        }
        coupon.discountValue = discountValue;
      }
      
      if (targetType) coupon.targetType = targetType;
      if (target) coupon.target = target;
      if (validFrom) coupon.validFrom = validFrom;
      if (validTo) coupon.validTo = validTo;
      if (status) coupon.status = status;
      if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
      if (minPurchaseAmount !== undefined) {
        if (isNaN(minPurchaseAmount) || Number(minPurchaseAmount) < 0) {
          return res.status(400).json({ message: "minPurchaseAmount must be a non-negative number" });
        }
        coupon.minPurchaseAmount = minPurchaseAmount;
      }
      // New: Update firstPurchaseOnly if provided
      if (req.body.firstPurchaseOnly !== undefined) {
        // Optionally, validate it's a boolean
        if (typeof req.body.firstPurchaseOnly !== "boolean") {
          return res.status(400).json({ message: "firstPurchaseOnly must be a boolean" });
        }
        coupon.firstPurchaseOnly = req.body.firstPurchaseOnly;
      }
      
      // Validate target if targetType or target changed
      if (coupon.targetType === "Product") {
        const product = await Product.findById(coupon.target);
        if (!product) return res.status(400).json({ message: "Target product not found" });
      } else if (coupon.targetType === "Category") {
        const category = await Category.findById(coupon.target);
        if (!category) return res.status(400).json({ message: "Target category not found" });
      } else if (coupon.targetType === "SubCategory") {
        const subcategory = await SubCategory.findById(coupon.target);
        if (!subcategory) return res.status(400).json({ message: "Target subcategory not found" });
      } else if (coupon.targetType === "Brand") {
        if (typeof coupon.target !== "string" || !coupon.target.trim()) {
          return res.status(400).json({ message: "Invalid target brand" });
        }
      }
      
      await coupon.save();
      res.status(200).json({ message: "Coupon updated successfully", coupon });
    } catch (error) {
      res.status(500).json({ message: "Error updating coupon", error: error.message });
    }
  };
  
  
  // Delete a coupon
  exports.deleteCoupon = async (req, res) => {
    try {
      const coupon = await Coupon.findByIdAndDelete(req.params.id);
      if (!coupon) return res.status(404).json({ message: "Coupon not found" });
      res.status(200).json({ message: "Coupon deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting coupon", error: error.message });
    }
  };
  