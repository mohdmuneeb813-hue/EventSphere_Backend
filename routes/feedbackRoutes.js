const express = require('express');
const router = express.Router();

const {
  getAllFeedbacks,
  createFeedback,
  updateFeedbackStatus,
  deleteFeedback,
} = require('../controllers/feedbackController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Any authenticated user may submit feedback
router.post('/', verifyToken, createFeedback);

// Admin-only: list / status-update / delete feedback
router.get('/', verifyToken, authorize('admin'), getAllFeedbacks);
router.put('/:id', verifyToken, authorize('admin'), updateFeedbackStatus);
router.delete('/:id', verifyToken, authorize('admin'), deleteFeedback);

module.exports = router;
