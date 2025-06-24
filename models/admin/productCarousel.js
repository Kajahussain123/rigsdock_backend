const mongoose = require("mongoose");

const productCarouselSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    subtitle: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      required: true
    },
    startingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("productCarousel", productCarouselSchema);