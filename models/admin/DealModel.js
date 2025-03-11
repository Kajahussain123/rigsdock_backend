const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    // targetType: "Product" (an array or single product), "Category", or "SubCategory"
    targetType: { type: String, enum: ["Product", "Category", "SubCategory"], required: true },
    // target: if targetType is "Product", this may be an array; for others, a single ObjectId.
    target: { type: mongoose.Schema.Types.Mixed, required: true },
    // New: Array of product IDs to which this deal applies.
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    // Full date-time fields allow scheduling (e.g. 10 AM to 11 AM)
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deal", dealSchema);
