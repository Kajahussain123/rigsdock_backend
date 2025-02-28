const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  // Extend targetType to include SubCategory
  targetType: { type: String, enum: ['Product', 'Category', 'SubCategory'], required: true },
  // When targetType is "Product" this can be an array (or single id),
  // for "Category" or "SubCategory" this is a single ObjectId.
  target: {
    type: mongoose.Schema.Types.Mixed, 
    required: true
  },
  validFrom: { type: Date },
  validTo: { type: Date },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
