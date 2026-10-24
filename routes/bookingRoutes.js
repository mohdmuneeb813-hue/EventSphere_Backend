const express = require('express');
const router = express.Router();
const { bookExpo, getAttendeeBookings, getAllBookings } = require('../controllers/bookingController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Attendee books an expo ticket (any authenticated user may book)
router.post('/book', verifyToken, bookExpo);

// Attendee views their own bookings (any authenticated user)
router.get('/attendee/:attendeeId', verifyToken, getAttendeeBookings);

// Admin-only: system-wide bookings view
router.get('/all', verifyToken, authorize('admin'), getAllBookings);

module.exports = router;
