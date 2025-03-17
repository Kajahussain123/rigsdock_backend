const express = require("express");
const router = express.Router();
const chatController = require("../../../controllers/Admin/Chat/ChatController");
const verifyToken = require("../../../middleware/jwt");

// Get conversations for admin (list of vendors with latest messages)
router.get("/conversations", verifyToken(["Admin"]),chatController.conversations);

// Get chat history between admin and a specific vendor
router.get("/history/:vendorId",verifyToken(["Admin"]),chatController.vendorChatHistory);

module.exports = router;