const express = require('express');
const router = express.Router();
const notificationController = require('../../../controllers/Vendor/Notification/NotificationController');
const multerConfig = require('../../../middleware/multer');
const verifyToken = require('../../../middleware/jwt');

//create notification
router.post('/create',verifyToken(['Vendor']),multerConfig.single('image'),notificationController.createNotification);

//get notifications
router.get('/get',verifyToken(['Vendor']),notificationController.getNotifications);

//get notifications by id
router.get('/get/:id',verifyToken(['Vendor']),notificationController.getNotificationById);

// update notification
router.patch('/update/:id',verifyToken(['Vendor']),multerConfig.single('image'),notificationController.updateNotification);

// delete notification
router.delete('/delete/:id',verifyToken(['Vendor']),notificationController.deleteNotification);

// search notifications
router.get('/search',verifyToken(['Vendor']),notificationController.searchNotifications);

module.exports = router;