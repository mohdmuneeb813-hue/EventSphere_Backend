const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const Booth = require('../models/Booth');

// 1. Search & Filter Exhibitors (by category, product, or keywords)
// (Public — no auth required to browse the exhibitor directory.)
exports.searchExhibitors = async (req, res) => {
  try {
    const { keyword, category } = req.query;
    let query = { role: 'exhibitor' };

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { 'companyDetails.companyName': { $regex: keyword, $options: 'i' } }
      ];
    }

    if (category) {
      query['companyDetails.productsOrServices'] = { $regex: category, $options: 'i' };
    }

    const exhibitors = await User.find(query).select('-password');
    res.status(200).json(exhibitors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. Bookmark / Register for a Session (toggle)
// Body: { scheduleId, userId }. The `userId` MUST equal the JWT-decoded
// `req.user.id` — the route layer enforces this below.
exports.toggleSessionBookmark = async (req, res) => {
  try {
    const { scheduleId, userId } = req.body;

    // Defense in depth: caller cannot toggle bookmarks for a different user.
    if (!userId || userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: 'You can only toggle bookmarks for your own account.' });
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // ObjectId-safe lookup: schedule.attendees is [ObjectId], userId is a string.
    const index = schedule.attendees.findIndex(
      (id) => id.toString() === String(userId)
    );
    if (index > -1) {
      schedule.attendees.splice(index, 1);
      await schedule.save();
      return res.status(200).json({ message: 'Session unbookmarked successfully', schedule });
    }
    schedule.attendees.push(userId);
    await schedule.save();
    return res.status(200).json({ message: 'Session bookmarked successfully', schedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. Admin Analytics & Reporting
exports.getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalExhibitors = await User.countDocuments({ role: 'exhibitor' });
    const totalAttendees = await User.countDocuments({ role: 'attendee' });
    const totalBookings = await Booking.countDocuments();
    const totalBooths = await Booth.countDocuments();
    const approvedBooths = await Booth.countDocuments({ status: 'Approved' });

    res.status(200).json({
      totalUsers,
      totalExhibitors,
      totalAttendees,
      totalBookings,
      totalBooths,
      approvedBooths
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// NOTE: The duplicate `sendMessage`, `getMessages`, `submitFeedback`, and
// `getAllFeedbacks` handlers that used to live here have been removed. The
// canonical endpoints for those resources live under `/api/messages` and
// `/api/feedback` (their own routers + controllers), which the frontend
// already uses. Keeping a parallel path here caused confusion and meant
// the same action could be triggered via two different routes with
// slightly different behaviour (e.g. only /api/feedback broadcasts
// FEEDBACK_SUBMITTED via Socket.io).
