const ollamaQuizService = require('./services/ollamaQuizService');
const jwt = require('jsonwebtoken');
const pdfQuizService = require('./services/pdfQuizService');
const ChatRoom = require('./models/ChatRoom'); // Import ChatRoom model
const ChatMessage = require('./models/ChatMessage'); // Import ChatMessage model
const User = require('./models/User'); // Assuming User model exists for authentication

// Map to store AbortControllers for each WebSocket connection (existing)
const activeGenerations = new Map();

// Map to store active WebSocket connections by userId
const connectedUsers = new Map(); // userId -> WebSocket

// Map to store WebSocket connections by chatRoomId
const chatRoomConnections = new Map(); // chatRoomId -> Set<WebSocket>

const setupWebSocket = (wss) => {
  wss.on('connection', (ws, req) => {
    ws.userId = req.user.id;

    // If there's an existing connection for this user, close it.
    if (connectedUsers.has(ws.userId)) {
      const oldWs = connectedUsers.get(ws.userId);
      oldWs.terminate(); // More forceful than close()
    }
    connectedUsers.set(ws.userId, ws);

    ws.on('message', async message => {
      try {
        const parsedMessage = JSON.parse(message);
        const userId = ws.userId;

        if (parsedMessage.type === 'authenticate') {
          // The connection is already authenticated by the middleware.
          // This is just to acknowledge the client's message.
          ws.send(JSON.stringify({ type: 'authenticated' }));
          return;
        }

        if (!userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Authentication required.' }));
          return;
        }

        if (parsedMessage.type === 'generateQuizRequest') {
          const { topic, numQuestions, difficulty } = parsedMessage.payload;
          const controller = new AbortController();
          activeGenerations.set(ws, controller);

          try {
            await ollamaQuizService.getQuestions(topic, parseInt(numQuestions, 10) || 5, controller.signal, ws);
          } catch (error) {
            console.error('Error generating quiz via WebSocket:', error);
            ws.send(JSON.stringify({ type: 'error', message: error.message || 'An unknown error occurred during quiz generation.' }));
          } finally {
            activeGenerations.delete(ws);
          }
        } else if (parsedMessage.type === 'generatePdfQuizRequest') {
          const { pdfFilePath, numQuestions } = parsedMessage.payload;
          const controller = new AbortController();
          activeGenerations.set(ws, controller);

          try {
            await pdfQuizService.getQuestionsFromPdf(pdfFilePath, parseInt(numQuestions, 10) || 5, ws, controller.signal);
          } catch (error) {
            console.error('Error generating PDF quiz via WebSocket:', error);
            ws.send(JSON.stringify({ type: 'quizGenerationError', message: error.message || 'An unknown error occurred during PDF quiz generation.' }));
          } finally {
            activeGenerations.delete(ws);
          }
        } else if (parsedMessage.type === 'cancelPdfQuizGeneration') {
          const controller = activeGenerations.get(ws);
          if (controller) {
            controller.abort();
          } else {
            console.warn('No active quiz generation to cancel for this client.');
          }
        } else if (parsedMessage.type === 'joinChatRoom') {
            const { chatRoomId } = parsedMessage.payload;
            try {
                const chatRoom = await ChatRoom.findById(chatRoomId);
                if (!chatRoom) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Chat room not found.' }));
                    return;
                }

                if (chatRoom.type !== 'global' && !chatRoom.members.includes(userId)) {
                    ws.send(JSON.stringify({ type: 'error', message: 'You are not authorized to join this chat room.' }));
                    return;
                }

                if (!chatRoomConnections.has(chatRoomId)) {
                    chatRoomConnections.set(chatRoomId, new Set());
                }
                chatRoomConnections.get(chatRoomId).add(ws);

                const messages = await ChatMessage.find({ chatRoom: chatRoomId })
                    .sort({ createdAt: 1 })
                    .limit(50)
                    .populate('sender', 'username profilePicture');

                ws.send(JSON.stringify({
                    type: 'chatHistory',
                    payload: { chatRoomId, messages }
                }));
            } catch (error) {
                console.error('Error joining chat room:', error);
                ws.send(JSON.stringify({ type: 'error', message: 'Failed to join chat room.' }));
            }
        } else if (parsedMessage.type === 'chatMessage') {
            const { chatRoomId, content } = parsedMessage.payload;
            try {
                const chatRoom = await ChatRoom.findById(chatRoomId);
                if (!chatRoom) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Chat room not found.' }));
                    return;
                }

                if (chatRoom.type !== 'global' && !chatRoom.members.includes(userId)) {
                    ws.send(JSON.stringify({ type: 'error', message: 'You are not authorized to send messages to this chat room.' }));
                    return;
                }

                const newMessage = new ChatMessage({
                    chatRoom: chatRoomId,
                    sender: userId,
                    content: content,
                    type: 'text',
                    readBy: [userId],
                });
                await newMessage.save();

                chatRoom.lastMessage = newMessage._id;
                await chatRoom.save();

                const populatedMessage = await ChatMessage.findById(newMessage._id)
                    .populate('sender', 'username profilePicture');

                broadcastToChatRoom(chatRoomId, {
                    type: 'newChatMessage',
                    payload: { chatRoomId, message: populatedMessage }
                });

            } catch (error) {
                console.error('Error sending chat message:', error);
                ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message.' }));
            }
        } else if (parsedMessage.type === 'markMessageAsRead') {
            const { messageId } = parsedMessage.payload;
            try {
                const messageToUpdate = await ChatMessage.findById(messageId);
                if (!messageToUpdate) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Message not found.' }));
                    return;
                }

                if (!messageToUpdate.readBy.includes(userId)) {
                    messageToUpdate.readBy.push(userId);
                    await messageToUpdate.save();

                    const senderWs = connectedUsers.get(messageToUpdate.sender.toString());
                    if (senderWs && senderWs.readyState === senderWs.OPEN) {
                        senderWs.send(JSON.stringify({
                            type: 'messageRead',
                            payload: {
                                chatRoomId: messageToUpdate.chatRoom.toString(),
                                messageId: messageToUpdate._id.toString(),
                                readerId: userId,
                            }
                        }));
                    }
                }
            } catch (error) {
                console.error('Error marking message as read via WebSocket:', error);
                ws.send(JSON.stringify({ type: 'error', message: 'Failed to mark message as read.' }));
            }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
      }
    });

    ws.on('close', () => {
      // Abort any active generation for this client when they disconnect
      const controller = activeGenerations.get(ws);
      if (controller) {
        controller.abort();
        activeGenerations.delete(ws);
        
      }

      // Remove from connectedUsers map
      if (ws.userId && connectedUsers.has(ws.userId)) {
          connectedUsers.delete(ws.userId);
      }

      // Remove from all chat rooms
      chatRoomConnections.forEach((connections, chatRoomId) => {
          if (connections.has(ws)) {
              connections.delete(ws);
              if (connections.size === 0) {
                  chatRoomConnections.delete(chatRoomId); // Clean up empty sets
              }
          }
      });
    });

    ws.on('error', error => {
      console.error('WebSocket error:', error);
      // Abort any active generation for this client on error
      const controller = activeGenerations.get(ws);
      if (controller) {
        controller.abort();
        activeGenerations.delete(ws);
        
      }

      // Remove from connectedUsers map
      if (ws.userId && connectedUsers.has(ws.userId)) {
          connectedUsers.delete(ws.userId);
      }

      // Remove from all chat rooms
      chatRoomConnections.forEach((connections, chatRoomId) => {
          if (connections.has(ws)) {
              connections.delete(ws);
              if (connections.size === 0) {
                  chatRoomConnections.delete(chatRoomId); // Clean up empty sets
              }
          }
      });
    });
  });
};

// Helper function to broadcast messages to a specific chat room
function broadcastToChatRoom(chatRoomId, message, excludeWs = null) {
    const connections = chatRoomConnections.get(chatRoomId);
    if (connections) {
        connections.forEach(clientWs => {
            if (clientWs !== excludeWs && clientWs.readyState === clientWs.OPEN) {
                clientWs.send(JSON.stringify(message));
            }
        });
    }
}

module.exports = setupWebSocket;