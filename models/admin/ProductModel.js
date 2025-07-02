const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    BISCode: { type: String, required: true },
    HSNCode: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    finalPrice: {
      type: Number,
      default: function () { return this.price; }
    },
    deliveryfee: { type: Number, default: 0 },
    stock: { type: Number, required: true, min: 0 },
    brand: { type: String, required: true },
    maincategory: { type: mongoose.Schema.Types.ObjectId, ref: "MainCategory", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
    attributes: { type: Map, of: mongoose.Schema.Types.Mixed },
    ownerType: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, refPath: "ownerType", required: true },
    images: {
      type: [String],
      validate: {
        validator: function (val) { return val.length <= 5; },
        message: "Maximum 5 images allowed",
      },
    },
    offer: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", default: null },
    deal: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", default: null },
    length: { type: Number, required: true },
    breadth: { type: Number, required: true },
    height: { type: Number, required: true },
    weight: { type: Number, required: true },
    
    // NEW APPROVAL FIELDS
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: function() {
        // Auto-approve if added by admin, set pending if added by vendor
        return this.ownerType === 'Admin' ? 'approved' : 'pending';
      }
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Index for efficient querying
productSchema.index({ status: 1, ownerType: 1 });

module.exports = mongoose.model("Product", productSchema);