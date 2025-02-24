const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: ["Storage", "Processor", "Memory", "Graphics Card", "Motherboard"], // Fixed categories
        unique: true, // Ensures no duplicate categories
    },
    image: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
