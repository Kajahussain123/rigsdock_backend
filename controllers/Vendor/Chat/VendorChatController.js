const Chat = require('../../../models/admin/chatModel');

// Get chat history with admin
exports.getChatHistory = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const messages = await Chat.find({
      $or: [
        { sender: vendorId, senderType: 'Vendor' },
        { receiver: vendorId, receiverType: 'Vendor' }
      ]
    }).sort({ timestamp: 1 });

    res.status(200).json({
      messageCount: messages.length,
      messages
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};