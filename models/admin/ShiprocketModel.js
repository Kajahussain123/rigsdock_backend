const mongoose = require('mongoose');

const ShiprocketTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Token expires after 24 hours (in seconds)
  }
});

// // Create a TTL index on createdAt field to automatically delete expired tokens
// ShiprocketTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('ShiprocketToken', ShiprocketTokenSchema);