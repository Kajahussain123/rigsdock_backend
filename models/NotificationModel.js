const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'role'
    },
    image: {
        type:String
    },
    description: {
        type: String,
        required: true
    },
},{ timestamps: true });

const Notification = mongoose.model('Notification',notificationSchema);

module.exports = Notification;