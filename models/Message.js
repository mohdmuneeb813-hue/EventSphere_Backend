const mongoose = require('mongoose');

// Chat message schema
const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'exhibitor', 'attendee'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      default: 'organizers', // 'organizers' | 'booth_neighbors' | 'attendees'
    },
  },
  { timestamps: true } // createdAt + updatedAt automatically add honge
);

module.exports = mongoose.model('Message', messageSchema);
