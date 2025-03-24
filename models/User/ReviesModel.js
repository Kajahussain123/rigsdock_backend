const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      required: true
    },
    response: {
      // New field for vendor response
      type: String,
      default: ""
    },
    report: {
      // New field for reporting unfair reviews
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor"
      },
      reason: String,
      status: {
        type: String,
        enum: ["Pending", "Resolved"],
        default: "Pending"
      }
    },
    images: [
      {
        type: String, // Store image file paths
        required: true
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
