const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    // finalPrice stores the effective price (updated by deal or offer)
    finalPrice: {
      type: Number,
      default: function () { return this.price; }
    },
    deliveryfee: { type: Number, default:0 },
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
    // Only one immediate discount is applied: either an offer or a deal.
    offer: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", default: null },
    deal: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
