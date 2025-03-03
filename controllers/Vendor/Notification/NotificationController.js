const Notification = require('../../../models/NotificationModel');
const fs = require('fs')

//create new notification
exports.createNotification = async (req,res) => {
    const { title,description } = req.body;

    if(!req.file){
        return res.status(400).json({ message: "Notification Image is required" })
    }

    try {
        const newNotification = new Notification({
            title,
            image: req.file.filename,
            description,
            ownerId: req.user.id,
            role: req.user.role
        })
        await newNotification.save();
        res.status(201).json({ message: 'Notification created successfully', notification:newNotification })
    } catch (err) {
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

// get all notifications
exports.getNotifications = async (req,res) => {
    try {
        const notifications = await Notification.find().populate({path: 'ownerId', select: '-password'});
        if(!notifications.length === 0){
            return res.status(404).json({ message: "Notifications not found" })
        }
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching Notification', error:err.message })
    }
}

// get notification by id
exports.getNotificationById = async (req,res) => {
    const { id } = req.params;

    try {
        const notification = await Notification.findById(id).populate({path: 'ownerId', select: '-password'});
        if(!notification){
            return res.status(404).json({ message: "Notification not found" })
        }
        res.status(200).json(notification)
    } catch (err) {
        res.status(500).json({ message: 'Error fetching Notification',error: err.message })
    }
}

// update notification
exports.updateNotification = async (req,res) => {
    const { id } = req.params;
    const { title,description,date,time } = req.body;

    try {
        const notification = await Notification.findById(id);
        if(!notification){
            return res.status(404).json({ message: 'Notification not found' })
        }
        if(title) notification.title = title;
        if(description) notification.description = description;
        if(date) notification.date = date;
        if(time) notification.time = time;
        if(req.file){
            const imagePath = `./uploads/notification/${notification.image}`;
            if(fs.existsSync(imagePath)){
                fs.unlinkSync(imagePath)
            }
            notification.image = req.file.filename;
        }
        await notification.save();
        res.status(200).json({ message: 'Notification updated successfully', notification })
    } catch (err) {
        res.status(500).json({ message: 'Error updating Notification', error: err.message });
    }
}

// delete notification
exports.deleteNotification = async(req,res) => {
    const { id } = req.params;

    try {
        const notification = await Notification.findById(id);
        if(!notification){
            return res.status(404).json({ message: 'Notification not found' })
        }
        const oldImagePath = `./uploads/notification/${notification.image}`;
        if(fs.existsSync(oldImagePath)){
            fs.unlinkSync(oldImagePath)
        }
        await notification.deleteOne();
        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting Notification', error: err.message });
    }
}

//search notifications
exports.searchNotifications = async (req,res) => {
    const { title } = req.query;

    try {
        const query = {};
        if(title){
            query.title = { $regex: title, $options: 'i' };
        }

        const notifications = await Notification.find(query)    ;

        if (notifications.length === 0) {
            return res.status(404).json({ message: "No matching notifications found" });
        }

        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ message: 'Error searching Notification', error: err.message });
    }
}