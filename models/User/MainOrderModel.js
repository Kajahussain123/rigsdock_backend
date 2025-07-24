const mongoose = require("mongoose");

const mainOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    platformFee: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Credit Card", "Debit Card", "PhonePe", "Net Banking", "UPI"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Processing"], // Fixed enum values
      default: "Pending",
    },
    orderStatus: {
      type: String,
      enum: ["Processing", "Pending", "Shipped", "Delivered", "Cancelled", "Failed"], // Added "Failed"
      default: "Processing",
    },
    phonepeTransactionId: {
      type: String, // Keep as String - this is correct
      default: null,
      index: true, // Add index for faster queries
    },
    phonePeOrderId: {
      type: String,
      default: null,
    },
    shippingAddress: {
      ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address"
      },
      details: {
        firstName: String,
        lastName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        addressType: String
      }
    },
    subOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    isPendingPayment: {
      type: Boolean,
      default: false,
    },
    pendingCartData: {
      type: mongoose.Schema.Types.Mixed, // Stores vendor orders and cart data temporarily
      default: null,
    },
  },
  { timestamps: true }
);

// Add compound index for faster queries
mainOrderSchema.index({ phonepeTransactionId: 1, isPendingPayment: 1 });

module.exports = mongoose.model("MainOrder", mainOrderSchema);