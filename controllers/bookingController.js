const Booking = require('../models/Booking');

// 1. Book an Expo ticket for an Attendee
exports.bookExpo = async (req, res) => {
  try {
    const { expo, attendee } = req.body;

    // Check if user has already booked this expo
    const existingBooking = await Booking.findOne({ expo, attendee });
    if (existingBooking) {
      return res.status(400).json({ message: 'You have already booked a ticket for this expo.' });
    }

    // Generate a unique random ticket number
    const ticketNumber = 'TICK-' + Math.floor(100000 + Math.random() * 900000);

    const newBooking = new Booking({
      expo,
      attendee,
      ticketNumber
    });

    await newBooking.save();
    res.status(201).json({ message: 'Expo booked successfully!', booking: newBooking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. Get all bookings for a specific attendee
exports.getAttendeeBookings = async (req, res) => {
  try {
    const { attendeeId } = req.params;

    const bookings = await Booking.find({ attendee: attendeeId })
      .populate('expo', 'title description location date theme')
      .populate('attendee', 'name email');

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. Get all system bookings (For Admin view)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('expo', 'title location date')
      .populate('attendee', 'name email');

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};