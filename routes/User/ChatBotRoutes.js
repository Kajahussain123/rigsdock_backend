const express = require('express');
const router = express.Router();
const Order = require('../../models/User/OrderModel');
const ChatLog = require('../../models/admin/ChatBotModel'); // You'll need to create this model

const userSessions = {};

// Middleware to log all chats
const logChat = async (userId, message, reply, attachments = []) => {
    try {
        await ChatLog.create({
            userId,
            userMessage: message,
            botReply: reply,
            attachments,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error logging chat:', error);
    }
};

const chatbotReply = async (userId, message, attachments = []) => {
    const text = message.toLowerCase();

    // Thank you message to append to final responses
    const thankYouMessage = `

🙏 Thank you for contacting us! We think your issue has been resolved. 

Still facing issues? Please contact our support:
📞 +91-9778466748
📧 support@rigsdock.com`;

    // Log the incoming message
    try {
        // Handle Order ID lookup (existing logic)
        if (userSessions[userId]?.expectingOrderId && !userSessions[userId]?.paymentIssue && !userSessions[userId]?.expectingReturnInfo) {
            const orderId = message.trim();

            try {
                const order = await Order.findOne({
                    $or: [
                        { _id: orderId },
                        { phonePeOrderId: orderId }
                    ]
                })
                    .populate('shippingAddress')
                    .populate('user', 'name email phone')
                    .populate('items.product', 'name price')
                    .populate('vendor', 'name');

                userSessions[userId].expectingOrderId = false;

                if (order) {
                    let orderDetails = `✅ Order Found

📋 Order ID: ${order._id}`;

                    if (order.phonePeOrderId) {
                        orderDetails += `
💳 PhonePe Order ID: ${order.phonePeOrderId}`;
                    }

                    orderDetails += `
📦 Status: ${order.orderStatus}
💰 Payment Status: ${order.paymentStatus}
💵 Total Amount: ₹${order.totalPrice}
🏪 Vendor: ${order.vendor?.name || 'N/A'}`;

                    if (order.courier) {
                        orderDetails += `
🚚 Courier: ${order.courier}`;
                    }

                    if (order.trackingNumber) {
                        orderDetails += `
📍 Tracking Number: ${order.trackingNumber}`;
                    }

                    if (order.awb) {
                        orderDetails += `
📋 AWB: ${order.awb}`;
                    }

                    if (order.items && order.items.length > 0) {
                        orderDetails += `

📦 Items:`;
                        order.items.forEach((item, index) => {
                            orderDetails += `
${index + 1}. ${item.product?.name || 'Product'} - Qty: ${item.quantity} - ₹${item.price}`;
                        });
                    }

                    if (order.shippingAddress) {
                        orderDetails += `

🏠 Shipping Address:`;
                        const addr = order.shippingAddress;
                        const addressParts = [
                            addr.street,
                            addr.city,
                            addr.state,
                            addr.zipCode
                        ].filter(part => part && part.trim() !== '');

                        orderDetails += `
${addressParts.join(', ')}`;
                    }

                    switch (order.orderStatus) {
                        case 'Processing':
                            orderDetails += `

⏳ Your order is being processed. You'll receive shipping details soon.`;
                            break;
                        case 'Shipped':
                            orderDetails += `

🚚 Your order has been shipped! Track it using the tracking number above.`;
                            break;
                        case 'Delivered':
                            orderDetails += `

✅ Your order has been delivered! Thank you for shopping with us.`;
                            break;
                        case 'Cancelled':
                            orderDetails += `

❌ This order has been cancelled. Please contact support for more details.`;
                            break;
                    }

                    
                    orderDetails += thankYouMessage;

                    await logChat(userId, message, orderDetails, attachments);
                    return orderDetails;
                } else {
                    const notFoundReply = `❌ Order Not Found

Sorry, no order found with ID: "${orderId}"

Please check:
• Order ID format


For assistance, contact: +91-9778466748` + thankYouMessage;
                    await logChat(userId, message, notFoundReply, attachments);
                    return notFoundReply;
                }
            } catch (error) {
                console.error('Error fetching order:', error);
                const errorReply = `❌ Error

Sorry, there was an error retrieving your order. Please try again or contact support at +91-9778466748.` + thankYouMessage;
                await logChat(userId, message, errorReply, attachments);
                return errorReply;
            }
        }

       
        if (userSessions[userId]?.expectingReturnInfo) {
            if (!userSessions[userId].returnStep) {
                
                userSessions[userId].returnStep = 'order_id';
                userSessions[userId].returnOrderId = message.trim();
                
                const reply = `📦 Return Request - Order ID Received

                Order ID: ${message.trim()}

                Now please provide the reason for return:
                • Defective product
                • Wrong item received
                • Size/fit issue
                • Changed mind
                • Other (please specify)`;
                
                await logChat(userId, message, reply, attachments);
                return reply;
                
            } else if (userSessions[userId].returnStep === 'order_id') {
              
                const returnReason = message.trim();
                const orderId = userSessions[userId].returnOrderId;
                
                const returnDetails = `✅ Return Request Submitted

                📋 Order ID: ${orderId}
                🔄 Reason: ${returnReason}
                📅 Request Date: ${new Date().toLocaleDateString()}

                Your return request has been submitted successfully!

                What happens next:
                1. Our team will review your request within 24 hours
                2. You'll receive return instructions via email/SMS
                3. Return pickup will be scheduled (if applicable)
                4. Refund will be processed after inspection

                For urgent queries: +91-9778466748
                📧 support@rigsdock.com` + thankYouMessage;

               
                delete userSessions[userId];
                
                await logChat(userId, message, returnDetails, attachments);
                return returnDetails;
            }
        }

       
        if (text.includes('payment issue') || text.includes('payment problem') || 
            (userSessions[userId]?.paymentIssue && (attachments.length > 0 || message.toLowerCase() !== 'skip'))) {
            
            if (!userSessions[userId]?.paymentIssue) {
                userSessions[userId] = {
                    paymentIssue: true,
                    expectingOrderId: true
                };
                const initialReply = `💳 Payment Issue Assistance

                Please provide:
                1. Your Order ID
                2. Screenshot of payment/error (if available, or type 'skip')`;
                await logChat(userId, message, initialReply, attachments);
                return initialReply;
            } else {
                
                let paymentDetails = '';
                
                if (attachments.length > 0) {
                    paymentDetails = `📸 Screenshot received for payment issue.`;
                }
                
                if (message.toLowerCase() !== 'skip') {
                    paymentDetails += `\nOrder ID: ${message}`;
                }
                
                paymentDetails += `

                Our team will review your payment issue and respond within 24 hours. For immediate assistance, call +91-9778466748.` + thankYouMessage;
                
                delete userSessions[userId].paymentIssue;
                delete userSessions[userId].expectingOrderId;
                
                await logChat(userId, message, paymentDetails, attachments);
                return paymentDetails;
            }
        }

        
        if (text.includes('order status') || text.includes('track order') || text.includes('my order')) {
            userSessions[userId] = { expectingOrderId: true };
            const reply = `🔍 Order Lookup

            Please provide your Order ID  to check your order status.`;
            await logChat(userId, message, reply, attachments);
            return reply;
        }

        
        if (text.includes('return') || text.includes('refund')) {
            userSessions[userId] = { expectingReturnInfo: true };
            const reply = `🔄 Return Assistance

        You can place a return request within 7 days of delivery.

        Please provide your Order ID first:`;
            await logChat(userId, message, reply, attachments);
            return reply;
        }

       
        if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
            const reply = `👋 Hello!

I can help you with:
• Order status tracking
• Return requests
• Payment issues

How can I assist you today?`;
            await logChat(userId, message, reply, attachments);
            return reply;
        }

       
        if (text.includes('help') || text.includes('support')) {
            const reply = `💬 How can I help?

• Type "order status" to track your order
• Type "return" for return assistance
• Type "payment issue" for payment problems
• For direct support:
  📞 +91-9778466748
  📧 support@rigsdock.com`;
            await logChat(userId, message, reply, attachments);
            return reply;
        }
        if (text.includes('agent') || text.includes('human') || text.includes('representative')) {
            const reply = `👨‍💼 Support Agent

Connecting you to a support agent... Please wait, or call us directly at +91-9778466748.

You can also WhatsApp us at [Chat Now](#).` + thankYouMessage;
            await logChat(userId, message, reply, attachments);
            return reply;
        }
        const defaultReply = `🤖 I didn't understand that.

I can help you with:
• Order status - type "order status"
• Returns - type "return"
• Payment issues - type "payment issue"

For direct support:
📞 +91-9778466748
📧 support@rigsdock.com` + thankYouMessage;
        await logChat(userId, message, defaultReply, attachments);
        return defaultReply;

    } catch (error) {
        console.error('Error in chatbot processing:', error);
        const errorReply = `❌ Error

        Sorry, there was an error processing your request. Please try again or contact support at +91-9778466748.` + thankYouMessage;
        await logChat(userId, message, errorReply, attachments);
        return errorReply;
    }
};

router.patch('/chat-logs/:id/mark-read', async (req, res) => {
    try {
        const chat = await ChatLog.findByIdAndUpdate(
            req.params.id,
            { resolved: true },
            { new: true }
        );
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        res.json(chat);
    } catch (error) {
        console.error('Error marking chat as read:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST route for chat
router.post('/chat', async (req, res) => {
    try {
        const { userId, message, attachments } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                error: 'Missing userId or message.',
                reply: 'Please provide both userId and message.'
            });
        }

        const reply = await chatbotReply(userId, message, attachments || []);

        res.json({ 
            reply: reply.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(),
            fullReply: reply // Send the formatted reply as well
        });
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({
            error: 'Internal server error',
            reply: 'Sorry, there was an error processing your request. Please try again.'
        });
    }
});

router.get('/chat-logs', async (req, res) => {
    try {
        const { userId, phone, limit = 50, search } = req.query;
        let query = {};
        if (userId) {
            query.userId = userId;
        }
        if (phone) {
            const users = await User.find({ phone }).select('_id');
            const userIds = users.map(user => user._id);
            if (userIds.length > 0) {
                query.userId = { $in: userIds };
            } else {
                return res.json([]);
            }
        }
        
        if (search) {
            query.$or = [
                { userMessage: { $regex: search, $options: 'i' } },
                { botReply: { $regex: search, $options: 'i' } }
            ];
        }
        
        const logs = await ChatLog.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .populate('userId', 'name email phone');
            
        res.json(logs);
    } catch (error) {
        console.error('Error fetching chat logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/chat-logs/:id', async (req, res) => {
    try {
        const chat = await ChatLog.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        res.json(chat);
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/clear-session', (req, res) => {
    const { userId } = req.body;
    if (userId && userSessions[userId]) {
        delete userSessions[userId];
    }
    res.json({ message: 'Session cleared' });
});

module.exports = router;