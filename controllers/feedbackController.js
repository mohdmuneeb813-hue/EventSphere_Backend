const Feedback = require('../models/Feedback');

// GET /api/feedback
// List all feedback tickets (admin/support desk view), newest-first.
exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (err) {
    console.error('Get feedbacks error:', err);
    res.status(500).json({ message: 'Server error while fetching feedbacks' });
  }
};

// POST /api/feedback
// Submit a new feedback / support ticket. The backend broadcasts a
// FEEDBACK_SUBMITTED event via Socket.io so admin viewers see the new ticket
// in real time.
exports.createFeedback = async (req, res) => {
  try {
    const { category, subject, message, userName, userEmail, role } = req.body;

    if (!category || !subject || !message || !userName || !userEmail) {
      return res.status(400).json({ message: 'category, subject, message, userName, and userEmail are required' });
    }

    const newFeedback = await Feedback.create({
      category,
      subject,
      message,
      userName,
      userEmail,
      role: role || 'attendee',
    });

    // Real-time notify admin viewers via Socket.io.
    const io = req.app.get('io');
    if (io) {
      io.emit('FEEDBACK_SUBMITTED', newFeedback);
    }

    res.status(201).json(newFeedback);
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(500).json({ message: 'Server error while saving feedback' });
  }
};

// PUT /api/feedback/:id
// Feedback status update (Open <-> Resolved)
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Open', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Open or Resolved' });
    }

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error('Update feedback error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/feedback/:id
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    res.status(200).json({ message: 'Feedback deleted successfully' });
  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
