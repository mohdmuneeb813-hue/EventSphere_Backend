const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    expo: { type: mongoose.Schema.Types.ObjectId, ref: 'Expo', required: true },
    sessionTitle: { type: String, required: true },
    speaker: { type: String, required: true },
    topic: { type: String, required: true },
    timeSlot: { type: String, required: true },
    location: { type: String, required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);