const express = require('express');
const router = express.Router();
const userController = require('../../../controllers/Admin/User/UserController');
const verifyToken = require('../../../middleware/jwt');

// get all users
router.get('/get',verifyToken(['Admin']),userController.getAllUsers);

router.get('/get/:id',verifyToken(['Admin']),userController.getUserById);


module.exports = router;