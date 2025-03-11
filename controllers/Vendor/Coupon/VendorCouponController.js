const Coupon = require("../../../models/admin/couponModel");
const Product = require("../../../models/admin/ProductModel");

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
        ownerType: req.user.role,
        ownerId: req.user.id,
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
      const coupons = await Coupon.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
      if(coupons.length === 0) {
        return res.status(404).json({ message: "No coupons found" })
      }
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
      if (firstPurchaseOnly !== undefined) {
        // Optionally, validate it's a boolean
        if (typeof firstPurchaseOnly !== "boolean") {
          return res.status(400).json({ message: "firstPurchaseOnly must be a boolean" });
        }
        coupon.firstPurchaseOnly = firstPurchaseOnly;
      }
      
      // Validate target if targetType or target changed
      if (coupon.targetType === "Product") {
        const product = await Product.findById(coupon.target);
        if (!product) return res.status(400).json({ message: "Target product not found" });
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