const express = require("express");
const router = express.Router();
const chatController = require("../../../controllers/Vendor/Chat/VendorChatController");
const verifyToken = require("../../../middleware/jwt");

// Get chat history with admin
router.get("/history", verifyToken(["Vendor"]),chatController.getChatHistory);

module.exports = router;
 