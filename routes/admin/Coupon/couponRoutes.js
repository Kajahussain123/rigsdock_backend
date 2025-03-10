const express = require("express");
const router = express.Router();
const couponController = require("../../../controllers/Admin/Coupon/couponController");
const verifyToken = require("../../../middleware/jwt");

// Create coupon (Admin only)
router.post("/create",verifyToken(["Admin"]),couponController.createCoupon);

// Get all coupons
router.get("/get",verifyToken(["Admin"]),couponController.getCoupons);

// Get coupon by ID
router.get("/get/:id",verifyToken(["Admin"]),couponController.getCouponById);

// Update coupon (Admin only)
router.patch("/update/:id", verifyToken(["Admin"]), couponController.updateCoupon);

// Delete coupon (Admin only)
router.delete("/delete/:id", verifyToken(["Admin"]), couponController.deleteCoupon);

module.exports = router;
  