const mongoose = require('mongoose');

// Feedback / support ticket schema
const feedbackSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ['Feedback', 'Booth Issue', 'Schedule Issue', 'Other'],
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'exhibitor', 'attendee'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Resolved'],
      default: 'Open',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
