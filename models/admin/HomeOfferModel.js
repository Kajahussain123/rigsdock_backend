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
  targetType: {
    type: String,
    enum: ['Product', 'Category', 'SubCategory', 'All'],
    required: true
  },
  target: {
    type: mongoose.Schema.Types.Mixed, // Can be string, array, or null for 'All' type
    required: function() {
      return this.targetType !== 'All';
    }
  },
  productIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
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
    default: true // This helps distinguish home offers from other types
  }
}, {
  timestamps: true
});

// Indexes for better query performance
homeOfferSchema.index({ status: 1, validFrom: 1, validTo: 1 });
homeOfferSchema.index({ targetType: 1, target: 1 });
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

// Static method to find active offers for a product
homeOfferSchema.statics.findActiveOffersForProduct = function(productId, category, subcategory) {
  const now = new Date();
  return this.find({
    status: 'active',
    $or: [
      { productIds: productId },
      { target: productId, targetType: 'Product' },
      { target: category, targetType: 'Category' },
      { target: subcategory, targetType: 'SubCategory' },
      { targetType: 'All' }
    ],
    $and: [
      { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
      { $or: [{ validTo: { $exists: false } }, { validTo: { $gte: now } }] },
      { $or: [{ maxUsage: { $exists: false } }, { $expr: { $lt: ['$usageCount', '$maxUsage'] } }] }
    ]
  });
};

// Static method to find active home offers
homeOfferSchema.statics.findActiveHomeOffers = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    isHomeOffer: true,
    $and: [
      { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
      { $or: [{ validTo: { $exists: false } }, { validTo: { $gte: now } }] },
      { $or: [{ maxUsage: { $exists: false } }, { $expr: { $lt: ['$usageCount', '$maxUsage'] } }] }
    ]
  });
};

// Pre-save middleware to handle image path formatting
homeOfferSchema.pre('save', function(next) {
  if (this.image && !this.image.startsWith('http')) {
    // Ensure the image path is properly formatted for URL access
    this.image = this.image.replace(/\\/g, '/');
  }
  next();
});

module.exports = mongoose.model('HomeOffer', homeOfferSchema);