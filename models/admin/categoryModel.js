const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
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
    },
    maincategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MainCategory',
        required: true,
    }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
