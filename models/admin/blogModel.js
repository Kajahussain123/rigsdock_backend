const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    ownerrole: {
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

const Carousel = mongoose.model("Blog", blogSchema);
module.exports = Carousel;
