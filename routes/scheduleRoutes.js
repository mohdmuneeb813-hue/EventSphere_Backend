const express = require('express');
const router = express.Router();
const {
  createSchedule,
  getExpoSchedules,
  getBookmarkedSchedules,
  deleteSchedule,
} = require('../controllers/scheduleController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Public: anyone may view sessions for an expo
router.get('/expo/:expoId', getExpoSchedules);

// Authenticated: list the sessions the calling user has bookmarked.
// The `:userId` param must equal `req.user.id` (enforced in the controller).
router.get('/bookmarked/:userId', verifyToken, getBookmarkedSchedules);

// Admin-only: create / delete schedule sessions
router.post('/create', verifyToken, authorize('admin'), createSchedule);
router.delete('/delete/:id', verifyToken, authorize('admin'), deleteSchedule);

module.exports = router;
