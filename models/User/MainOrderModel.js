const mongoose = require("mongoose");

const addressEmbeddedSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  addressType: { type: String, enum: ["Home", "Office", "Other"], default: "Home" }
}, { _id: false }); 



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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    shippingAddressSnapshot: {
      type: addressEmbeddedSchema,
      required: true,
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