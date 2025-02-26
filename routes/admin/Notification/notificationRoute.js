const express = require('express');
const router = express.Router();
const notificationController = require('../../../controllers/Admin/Notification/notificationController');
const multerConfig = require('../../../middleware/multer');

//create notification
router.post('/create',multerConfig.single('image'),notificationController.createNotification);

//get notifications
router.get('/get',notificationController.getNotifications);

//get notifications by id
router.get('/get/:id',notificationController.getNotificationById);

// update notification
router.patch('/update/:id',multerConfig.single('image'),notificationController.updateNotification);

// delete notification
router.delete('/delete/:id',notificationController.deleteNotification);

// search notifications
router.get('/search',notificationController.searchNotifications);

module.exports = router;