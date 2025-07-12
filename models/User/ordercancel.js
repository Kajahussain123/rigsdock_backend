const mongoose = require("mongoose")

const cancelorderSchema = new mongoose.Schema({
     user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },
      quantity: Number
    }
  ],
  totalAmount: Number,
  status: {
    type: String,
    default: "Placed",
    enum: ["Placed", "Shipped", "Delivered", "Cancelled"]
  },
  cancellationReason: {
    type: String,
    default: ""
  },
  cancelledAt: {
    type: Date
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ordercancel", cancelorderSchema )