const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    brand: { type: String, required: true },
    maincategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainCategory",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    attributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    ownerType: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, refPath: "ownerType", required: true },
    images: {
      type: [String],
      validate: {
        validator: function (val) {
          return val.length <= 5;
        },
        message: "Maximum 5 images allowed",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
