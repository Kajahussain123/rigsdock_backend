const mongoose = require("mongoose");

const PlatformFeeSchema = new mongoose.Schema({
  feeType: {
    type: String,
    enum: ["fixed", "percentage"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("PlatformFee", PlatformFeeSchema);
