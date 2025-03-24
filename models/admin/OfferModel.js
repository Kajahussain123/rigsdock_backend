const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  // Target type for the offer: "Product", "Category", or "SubCategory"
  targetType: { type: String, enum: ['Product', 'Category', 'SubCategory'], required: true },
  // When targetType is "Product", this can be an array (or a single ID);
  // for "Category" or "SubCategory", a single ObjectId is used.
  target: { type: mongoose.Schema.Types.Mixed, required: true },
  // New field: an array of affected product IDs (optional, but useful for population)
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  validFrom: { type: Date },
  validTo: { type: Date },
  ownerType: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, refPath: "ownerType" },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
