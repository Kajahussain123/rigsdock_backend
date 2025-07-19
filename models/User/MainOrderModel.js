const mongoose = require("mongoose");

const mainOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Credit Card", "Debit Card", "PhonePe", "Net Banking"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Processing"], // Add "Processing" to the allowed values
      default: "Pending",
  },
  
    orderStatus: {
      type: String,
      enum: ["Processing","Pending", "Shipped", "Delivered", "Cancelled"],
      default: "Processing",
    },

    phonepeTransactionId : {
      type: String, // Stores the Cashfree transaction ID
      default: null,
    },
    phonePeOrderId: {
      type: String,  // Stores the Cashfree order ID reference
      default: null,
    },
    shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    subOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MainOrder", mainOrderSchema);
