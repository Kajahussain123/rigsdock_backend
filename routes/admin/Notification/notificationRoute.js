const express = require('express');
const router = express.Router();
const notificationController = require('../../../controllers/Admin/Notification/notificationController');
const multerConfig = require('../../../middleware/multer');
const verifyToken = require('../../../middleware/jwt');

//create notification
router.post('/create',verifyToken(['Admin']),multerConfig.single('image'),notificationController.createNotification);

//get notifications
router.get('/get',verifyToken(['Admin']),notificationController.getNotifications);

//get notifications by id
router.get('/get/:id',verifyToken(['Admin']),notificationController.getNotificationById);

// update notification
router.patch('/update/:id',verifyToken(['Admin']),multerConfig.single('image'),notificationController.updateNotification);

// delete notification
router.delete('/delete/:id',verifyToken(['Admin']),notificationController.deleteNotification);

// search notifications
router.get('/search',verifyToken(['Admin']),notificationController.searchNotifications);

module.exports = router;