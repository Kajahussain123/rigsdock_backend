const Order = require("../../models/User/OrderModel")


const cancelOrder = async (req, res) => {  
  const { orderId } = req.params;
  const { reason } = req.body;

  // Validate cancellation reason
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ 
      error: 'Cancellation reason must be at least 5 characters long' 
    });
  }

  try {
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check order status
    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ 
        error: 'Delivered orders cannot be cancelled' 
      });
    }

    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ 
        error: 'Order is already cancelled',
        cancellationDetails: {
          reason: order.cancellationReason,
          cancelledAt: order.cancelledAt
        }
      });
    }

    // Update order status and cancellation info
    order.orderStatus = 'Cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();
    
    // If payment was made, you might want to initiate refund here
    if (order.paymentStatus === 'Paid') {
      // Add refund logic here
      // order.refundStatus = 'Pending';
    }

    await order.save();

    // Return the complete order with cancellation details
    const updatedOrder = await Order.findById(orderId)
      .populate('user', 'name email mobileNumber')
      .populate('vendor', 'businessname email number')
      .populate('items.product');

    res.status(200).json({
      message: 'Order cancelled successfully',
      order: updatedOrder,
      cancellationDetails: {
        reason: order.cancellationReason,
        cancelledAt: order.cancelledAt
      }
    });

  } catch (error) {
    console.error('Cancel Order Error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel order',
      details: error.message 
    });
  }
};

module.exports = {cancelOrder};

