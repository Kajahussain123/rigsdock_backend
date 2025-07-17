const express = require('express');
const router = express.Router();
const Order = require('../../models/User/OrderModel'); // Adjust your path

const userSessions = {}; // Use Redis or DB in production

// Enhanced chatbot reply logic
const chatbotReply = async (userId, message) => {
  const text = message.toLowerCase();

  // If the user is expected to send an Order ID
  if (userSessions[userId]?.expectingOrderId) {
    const orderId = message.trim();

    try {
      // Try to find by _id or phonePeOrderId with populated fields
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
        // Format order details more comprehensively
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
        
        // Show shipping information
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
        
        // Show items
        if (order.items && order.items.length > 0) {
          orderDetails += `

📦 Items:`;
          order.items.forEach((item, index) => {
            orderDetails += `
${index + 1}. ${item.product?.name || 'Product'} - Qty: ${item.quantity} - ₹${item.price}`;
          });
        }
        
        // Show shipping address
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
        
        // Add estimated delivery or next steps based on status
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
        
        return orderDetails;
      } else {
        return `❌ Order Not Found

Sorry, no order found with ID: "${orderId}"

Please check:
• Order ID format
• PhonePe Order ID if applicable

For assistance, contact: +91-9778466748`;
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      return `❌ Error

Sorry, there was an error retrieving your order. Please try again or contact support at +91-9778466748.`;
    }
  }

  // Handle various order-related queries
  if (text.includes('order status') || text.includes('track order') || text.includes('my order')) {
    userSessions[userId] = { expectingOrderId: true };
    return `🔍 Order Lookup

Please provide your Order ID or PhonePe Order ID to check your order status.`;
  }

  // Handle greetings
  if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
    return `👋 Hello!

I can help you with:
• Order status tracking
• Order information

Type "order status" to get started!`;
  }

  // Handle help queries
  if (text.includes('help') || text.includes('support')) {
    return `💬 How can I help?

• Type "order status" to track your order
• For other queries, contact: +91-9778466748
• Email: support@rigsdock.com`;
  }

  // Handle payment queries
  if (text.includes('payment') || text.includes('refund')) {
    return `💳 Payment Support

For payment-related queries, please contact our support team:
📞 +91-9778466748
📧 support@rigsdock.com

Or type "order status" to check payment status.`;
  }

  // Default response
  return `🤖 I didn't understand that.

I can help you with:
• Order status - type "order status"
• Order tracking

For other queries, please contact:
📞 +91-9778466748
📧 support@rigsdock.com`;
};

// POST route
router.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ 
        error: 'Missing userId or message.',
        reply: 'Please provide both userId and message.' 
      });
    }

    let reply = await chatbotReply(userId, message);

    // Remove \n and extra spaces
    reply = reply.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

    res.json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      reply: 'Sorry, there was an error processing your request. Please try again.' 
    });
  }
});


// Optional: Clear session endpoint
router.post('/clear-session', (req, res) => {
  const { userId } = req.body;
  if (userId && userSessions[userId]) {
    delete userSessions[userId];
  }
  res.json({ message: 'Session cleared' });
});

module.exports = router;