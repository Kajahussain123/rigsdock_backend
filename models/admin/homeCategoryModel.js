const mongoose = require('mongoose');

const homeCategorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  subtitle: {
    type: String,
    required: [true, 'Subtitle is required'],
    trim: true,
    maxlength: [200, 'Subtitle cannot exceed 200 characters']
  },
  image: {
    type: String,
    required: [true, 'Image is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // This will add createdAt and updatedAt automatically
});

// Index for better performance
homeCategorySchema.index({ isActive: 1 });
homeCategorySchema.index({ order: 1 });

module.exports = mongoose.model('HomeCategory', homeCategorySchema);