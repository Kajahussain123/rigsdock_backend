const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    userMessage: {
        type: String,
        required: true
    },
    botReply: {
        type: String,
        required: true
    },
    attachments: [{
        type: String, // URLs to stored attachments
        required: false
    }],
    timestamp: {
        type: Date,
        default: Date.now
    },
    resolved: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('ChatLog', ChatLogSchema);