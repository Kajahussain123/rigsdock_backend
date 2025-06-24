const mongoose = require('mongoose');

const homeOfferSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String, 
    default: null
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  productIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }],
  validFrom: {
    type: Date,
    default: null
  },
  validTo: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active'
  },
  ownerType: {
    type: String,
    enum: ['admin', 'vendor'],
    default: 'admin'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  maxUsage: {
    type: Number,
    default: null // null means unlimited
  },
  termsAndConditions: {
    type: String,
    trim: true
  },
  isHomeOffer: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
homeOfferSchema.index({ status: 1, validFrom: 1, validTo: 1 });
homeOfferSchema.index({ productIds: 1 });
homeOfferSchema.index({ ownerType: 1, ownerId: 1 });
homeOfferSchema.index({ isHomeOffer: 1 });

// Virtual to check if offer is currently valid
homeOfferSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  if (this.status !== 'active') return false;
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validTo && now > this.validTo) return false;
  if (this.maxUsage && this.usageCount >= this.maxUsage) return false;
  return true;
});

// Method to increment usage count
homeOfferSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Static method to find active offers for a specific product
homeOfferSchema.statics.findActiveOffersForProduct = function(productId) {
  const now = new Date();
  return this.find({
    status: 'active',
    productIds: productId,
    $and: [
      { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
      { $or: [{ validTo: { $exists: false } }, { validTo: { $gte: now } }] },
      { $or: [{ maxUsage: { $exists: false } }, { $expr: { $lt: ['$usageCount', '$maxUsage'] } }] }
    ]
  });
};

// Static method to find active home offers with product data
homeOfferSchema.statics.findActiveHomeOffersWithProducts = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    isHomeOffer: true,
    $and: [
      { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
      { $or: [{ validTo: { $exists: false } }, { validTo: { $gte: now } }] },
      { $or: [{ maxUsage: { $exists: false } }, { $expr: { $lt: ['$usageCount', '$maxUsage'] } }] }
    ]
  }).populate('productIds', 'name price finalPrice image category subcategory stock description');
};

// Pre-save middleware to handle image path formatting
homeOfferSchema.pre('save', function(next) {
  if (this.image && !this.image.startsWith('http')) {
    // Ensure the image path is properly formatted for URL access
    this.image = this.image.replace(/\\/g, '/');
  }
  next();
});

homeOfferSchema.pre('save', function(next) {
  if (!this.productIds || this.productIds.length === 0) {
    const error = new Error('At least one product ID is required');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('HomeOffer', homeOfferSchema);