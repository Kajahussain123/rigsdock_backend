const Chat = require('../../../models/admin/chatModel');

// Get conversations for admin (list of vendors with latest messages)
exports.conversations = async (req, res) => {
  try {
    // Get distinct vendors who have chatted with admin
    const vendorConversations = await Chat.aggregate([
      {
        $match: {
          $or: [
            { receiverType: 'Admin', senderType: 'Vendor' },
            { senderType: 'Admin', receiverType: 'Vendor' }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            vendorId: {
              $cond: {
                if: { $eq: ['$senderType', 'Vendor'] },
                then: '$sender',
                else: '$receiver'
              }
            }
          },
          lastMessage: { $first: '$message' },
          timestamp: { $first: '$timestamp' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$receiverType', 'Admin'] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id.vendorId',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      {
        $project: {
          vendorId: '$_id.vendorId',
          lastMessage: 1,
          timestamp: 1,
          unreadCount: 1,
          vendorName: { $arrayElemAt: ['$vendorInfo.name', 0] },
          vendorImage: { $arrayElemAt: ['$vendorInfo.profileImage', 0] }
        }
      },
      {
        $sort: { timestamp: -1 }
      }
    ]);

    res.status(200).json(vendorConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get chat history between admin and a specific vendor
exports.vendorChatHistory = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const adminId = req.user.id;
    
    const messages = await Chat.find({
      $or: [
        { sender: vendorId, senderType: 'Vendor', receiver: adminId, receiverType: 'Admin' },
        { sender: adminId, senderType: 'Admin', receiver: vendorId, receiverType: 'Vendor' }
      ]
    }).sort({ timestamp: 1 });
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};