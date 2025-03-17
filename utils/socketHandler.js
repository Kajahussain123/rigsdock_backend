const Chat = require('../models/admin/chatModel');

// Socket.io connection
module.exports = (io) => {
    io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a room based on user type and ID
    socket.on('joinRoom', (data) => {
        const { userId, userType } = data;
        const room = `${userType}-${userId}`;
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });

    // Handle chat messages
    socket.on('sendMessage', async (data) => {
        try {
        const { sender, senderType, receiver, receiverType, message } = data;
        
        // Create and save the message
        const chatMessage = new Chat({
            sender,
            senderType,
            receiver,
            receiverType,
            message
        });
        await chatMessage.save();
        
        // Define rooms for both sender and receiver
        // const senderRoom = `${senderType}-${sender}`;
        const receiverRoom = `${receiverType}-${receiver}`;
        
        // Emit to both rooms
        // io.to(senderRoom).emit('receiveMessage', chatMessage);
        io.to(receiverRoom).emit('receiveMessage', chatMessage);
        
        // If the receiver is Admin, also emit to a general admin notification
        if (receiverType === 'Admin') {
            io.to('AdminNotifications').emit('newMessageNotification', {
            from: senderType,
            senderId: sender,
            timestamp: chatMessage.timestamp
            });
        }
        } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
        }
    });

    // // Mark messages as read
    // socket.on('markAsRead', async (data) => {
    //   try {
    //     const { messageIds } = data;
    //     await Chat.updateMany(
    //       { _id: { $in: messageIds } },
    //       { $set: { read: true } }
    //     );
    //     socket.emit('messagesMarkedRead', { success: true, messageIds });
    //   } catch (error) {
    //     console.error('Error marking messages as read:', error);
    //     socket.emit('messageError', { error: 'Failed to mark messages as read' });
    //   }
    // });

    // // Handle typing indicator
    // socket.on('typing', (data) => {
    //   const { sender, senderType, receiver, receiverType } = data;
    //   const receiverRoom = `${receiverType}-${receiver}`;
    //   socket.to(receiverRoom).emit('userTyping', { sender, senderType });
    // });

    // // Handle stop typing
    // socket.on('stopTyping', (data) => {
    //   const { sender, senderType, receiver, receiverType } = data;
    //   const receiverRoom = `${receiverType}-${receiver}`;
    //   socket.to(receiverRoom).emit('userStoppedTyping', { sender, senderType });
    // });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
    });
};