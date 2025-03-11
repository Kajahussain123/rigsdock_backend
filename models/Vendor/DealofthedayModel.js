const mongoose = require('mongoose');

const dealOfTheDaySchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        unique: true,
    },
    offerPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["active","inactive"],
    }
},{ timestamps: true });

module.exports = mongoose.model("DealOfTheDay", dealOfTheDaySchema);