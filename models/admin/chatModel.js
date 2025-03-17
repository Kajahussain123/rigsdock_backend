// models/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'senderType',
        required: true
    },
    senderType: {
        type: String,
        enum: ['Admin', 'Vendor'],
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'receiverType',
        required: true
    },
    receiverType: {
        type: String,
        enum: ['Admin', 'Vendor'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Chat', chatSchema);