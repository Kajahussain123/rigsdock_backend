const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    couponCode: { type: String, required: true, unique: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    targetType: { type: String, enum: ["Brand", "Product", "Category", "SubCategory"], required: true },
    target: { type: mongoose.Schema.Types.Mixed, required: true },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    usageLimit: { type: Number, default: 0 },
    minPurchaseAmount: { type: Number, default: 0 },
    ownerType: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, refPath: "ownerType" },
    // New field: only applicable if it's the customer's first purchase.
    firstPurchaseOnly: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
