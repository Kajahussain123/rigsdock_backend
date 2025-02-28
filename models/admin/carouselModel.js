const mongoose = require("mongoose");

const carouselSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
    link: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true } 
);

const Carousel = mongoose.model("Carousel", carouselSchema);
module.exports = Carousel;
