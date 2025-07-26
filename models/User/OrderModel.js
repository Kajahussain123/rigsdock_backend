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

const orderSchema = new mongoose.Schema(
  {
    mainOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainOrder", // Reference to Main Order
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        // category: {
        //   type: mongoose.Schema.Types.ObjectId,
        //   ref: "Category",
        //   required: true,
        // },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    // commissionRate: {
    //   type: Number, // Commission percentage stored from category
    //   required: true,
    // },
    // commissionAmount: {
    //   type: Number, // Amount deducted from vendor earnings
    //   required: true,
    // },
    // vendorEarnings: {
    //   type: Number, // Earnings after commission deduction
    //   required: true,
    // },
    // payoutStatus: {
    //   type: String,
    //   enum: ["Pending", "Completed", "Failed"],
    //   default: "Pending",
    // },
    paymentMethod: {
      type: String,
      enum: ["COD", "Credit Card", "Debit Card", "PhonePe", "Net Banking"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Processing"],
      default: "Pending",
    },
    phonepeTransactionId: {
      type: String, // Stores the Cashfree transaction ID
      default: null,
    },
    phonePeOrderId: {
      type: String,  // Stores the Cashfree order ID reference
      default: null,
    },
    orderStatus: {
      type: String,
      enum: ["Processing", "Pending", "Shipped", "Delivered", "Cancelled"],
      default: "Processing",
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    cancelledAt: {
      type: Date
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
    settled: {
      type: Boolean,
      default: false
    },
    shiprocketOrderId: { type: String },
    shiprocketShipmentId: { type: String },
    trackingNumber: { type: String },
    courier: { type: String },
    awb: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
