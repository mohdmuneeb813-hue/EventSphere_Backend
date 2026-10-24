const express = require('express');
const router = express.Router();

const {
  getAllMessages,
  createMessage,
  deleteMessage,
} = require('../controllers/messageController');
const { verifyToken } = require('../middleware/authMiddleware');

// All message routes now require authentication. Previously these endpoints
// were unauthenticated, which allowed any unauthenticated client to read the
// full chat history, post messages, or delete records. The frontend already
// sends the Bearer token via the axios interceptor, so wiring the
// middleware here is transparent to the existing UI.

// Fetch all messages (chat history)
router.get('/', verifyToken, getAllMessages);

// Create a new message — backend will broadcast NEW_CHAT_MESSAGE via Socket.io
router.post('/', verifyToken, createMessage);

// Delete a message by _id
router.delete('/:id', verifyToken, deleteMessage);

module.exports = router;
