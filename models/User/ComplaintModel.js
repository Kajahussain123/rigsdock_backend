const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    complaintType: {
      type: String,
      enum: ["Damaged Product", "Wrong Item", "Missing Item", "Others"],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    images: {
        type: [String],
        validate: {
          validator: function (val) { return val.length <= 5; },
          message: "Maximum 5 images allowed",
        },
      },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Rejected"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
