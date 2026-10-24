const express = require('express');
const router = express.Router();
const {
  searchExhibitors,
  toggleSessionBookmark,
  getAnalytics,
} = require('../controllers/extraController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Public: search exhibitors (no auth required to browse the exhibitor directory)
router.get('/exhibitors/search', searchExhibitors);

// Any authenticated user may bookmark a session. The controller enforces that
// the body's `userId` matches the JWT-decoded `req.user.id`.
router.post('/schedule/bookmark', verifyToken, toggleSessionBookmark);

// Admin-only: analytics dashboard
router.get('/admin/analytics', verifyToken, authorize('admin'), getAnalytics);

// NOTE: The duplicate routes for `/message/send`, `/messages/:user1/:user2`,
// `/feedback/submit`, and `/feedback/all` have been removed. The canonical
// paths under `/api/messages` and `/api/feedback` are what the frontend uses
// (and they're the ones that broadcast the corresponding Socket.io events).

module.exports = router;
