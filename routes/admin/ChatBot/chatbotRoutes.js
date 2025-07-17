const express = require('express');
const router = express.Router();
const ChatLog = require('../../../models/admin/ChatBotModel');

// Get all conversations with pagination
router.get('/conversations', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const conversations = await ChatLog.aggregate([
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: "$userId",
          lastMessage: { $first: "$$ROOT" },
          messageCount: { $sum: 1 }
        }
      },
      {
        $sort: { "lastMessage.timestamp": -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: parseInt(limit)
      }
    ]);
    
    const total = await ChatLog.distinct('userId').countDocuments();
    
    res.json({
      conversations,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get full conversation for a user
router.get('/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await ChatLog.find({ userId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search conversations by message content
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 3) {
      return res.status(400).json({ error: 'Search query must be at least 3 characters' });
    }
    
    const results = await ChatLog.aggregate([
      {
        $match: {
          $or: [
            { message: { $regex: query, $options: 'i' } },
            { intent: { $regex: query, $options: 'i' } }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: "$userId",
          lastMessage: { $first: "$$ROOT" },
          matches: { $sum: 1 }
        }
      },
      {
        $sort: { "lastMessage.timestamp": -1 }
      },
      {
        $limit: 50
      }
    ]);
    
    res.json(results);
  } catch (error) {
    console.error('Error searching chats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;