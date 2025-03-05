const express = require("express");
const router = express.Router();
const couponController = require("../../../controllers/Vendor/Coupon/VendorCouponController");
const verifyToken = require("../../../middleware/jwt");

// Create coupon (Admin only)
router.post("/create", verifyToken(["Vendor"]), couponController.createCoupon);

// Get all coupons
router.get("/get", verifyToken(["Vendor"]),couponController.getCoupons);

// Get coupon by ID
router.get("/get/:id", verifyToken(["Vendor"]),couponController.getCouponById);

// Update coupon (Admin only)
router.patch("/update/:id", verifyToken(["Vendor"]), couponController.updateCoupon);

// Delete coupon (Admin only)
router.delete("/delete/:id", verifyToken(["Vendor"]), couponController.deleteCoupon);

module.exports = router;
  