const express = require("express");
const router = express.Router();
const couponController = require("../../../controllers/Admin/Coupon/couponController");
const verifyToken = require("../../../middleware/jwt");


// Create Coupon (Admin only)
router.post("/create", verifyToken(["Admin"]), couponController.createCoupon);

// Get all Coupons
router.get("/get", couponController.getCoupons);

// Get Coupon by ID
router.get("/get/:id", couponController.getCouponById);


// Update Coupon (Admin only)
router.patch("/update/:id", verifyToken(["Admin"]), couponController.updateCoupon);

// Delete Coupon (Admin only)
router.delete("/delete/:id", verifyToken(["Admin"]), couponController.deleteCoupon);

module.exports = router;
