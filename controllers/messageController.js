const Message = require('../models/Message');

// GET /api/messages
// Fetch all messages (chat history), sorted oldest-first.
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
};

// POST /api/messages
// Persist a new chat message and broadcast it to all connected clients
// via Socket.io (NEW_CHAT_MESSAGE event).
exports.createMessage = async (req, res) => {
  try {
    const { senderId, senderName, role, text, channel } = req.body;

    if (!senderId || !senderName || !text) {
      return res.status(400).json({ message: 'senderId, senderName, and text are required' });
    }

    const newMessage = await Message.create({
      senderId,
      senderName,
      role: role || 'exhibitor',
      text,
      channel: channel || 'organizers',
    });

    // Broadcast to every connected client via Socket.io.
    const io = req.app.get('io');
    if (io) {
      io.emit('NEW_CHAT_MESSAGE', newMessage);
    }

    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Create message error:', err);
    res.status(500).json({ message: 'Server error while saving message' });
  }
};

// DELETE /api/messages/:id
// Remove a message by _id (currently only used by the API contract; no UI
// surfaces this action yet).
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
