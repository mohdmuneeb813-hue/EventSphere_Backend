const Schedule = require('../models/Schedule');

// Create a new session/schedule for an expo
exports.createSchedule = async (req, res) => {
    try {
        const { expo, sessionTitle, speaker, topic, timeSlot, location } = req.body;

        const newSchedule = new Schedule({
            expo,
            sessionTitle,
            speaker,
            topic,
            timeSlot,
            location
        });

        await newSchedule.save();
        res.status(201).json({ message: 'Schedule session created successfully', schedule: newSchedule });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get schedules for a specific expo
exports.getExpoSchedules = async (req, res) => {
    try {
        const { expoId } = req.params;
        const schedules = await Schedule.find({ expo: expoId }).populate('expo', 'title location date');
        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all sessions bookmarked by a specific user (single round-trip).
// Replaces the N-requests fan-out the frontend previously needed: fetch all
// expos → fetch schedules per expo → filter by attendee. Returns sessions
// where the user's id appears in `Schedule.attendees`, with the parent expo
// populated so the UI can show the expo title alongside each session.
exports.getBookmarkedSchedules = async (req, res) => {
    try {
        const { userId } = req.params;

        // Defense in depth: an authenticated user can only query their own
        // bookmarks. (Route-level `verifyToken` already populated req.user.id.)
        if (req.user && req.user.id && req.user.id !== userId) {
            return res.status(403).json({
                message: 'You can only view your own bookmarked sessions.',
            });
        }

        const schedules = await Schedule.find({ attendees: userId })
            .populate('expo', 'title location date theme description')
            .sort({ timeSlot: 1, createdAt: 1 });

        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete a session
exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await Schedule.findByIdAndDelete(id);
        if (!schedule) {
            return res.status(404).json({ message: 'Session not found' });
        }
        res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};