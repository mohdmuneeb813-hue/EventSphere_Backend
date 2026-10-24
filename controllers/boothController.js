const Booth = require('../models/Booth');

// 1. Exhibitor applies for a booth
exports.applyBooth = async (req, res) => {
  try {
    const { expo, exhibitor, boothNumber, category } = req.body;

    // Check if booth number is already taken in this expo
    const existingBooth = await Booth.findOne({ expo, boothNumber });
    if (existingBooth) {
      return res.status(400).json({ message: 'This booth number is already booked or requested for this expo.' });
    }

    const newBoothRequest = new Booth({
      expo,
      exhibitor,
      boothNumber,
      category,
      status: 'Pending'
    });

    await newBoothRequest.save();
    res.status(201).json({ message: 'Booth application submitted successfully', booth: newBoothRequest });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. Get all booth requests (For Admin to review)
exports.getAllBooths = async (req, res) => {
  try {
    const booths = await Booth.find()
      .populate('expo', 'title location date')
      .populate('exhibitor', 'name email');
    res.status(200).json(booths);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. Admin updates booth status (Approve / Reject)
exports.updateBoothStatus = async (req, res) => {
  try {
    const { boothId } = req.params;
    const { status } = req.body; // 'Approved' or 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedBooth = await Booth.findByIdAndUpdate(
      boothId,
      { status },
      { new: true }
    );

    if (!updatedBooth) {
      return res.status(404).json({ message: 'Booth request not found' });
    }

    // Broadcast the status change to all connected clients (admin approve/decline
    // → exhibitor gets a real-time update). Mirrors how messageController and
    // feedbackController emit their respective events.
    const io = req.app.get('io');
    if (io) {
      io.emit('BOOTH_STATUS_CHANGED', updatedBooth);
    }

    res.status(200).json({ message: `Booth request ${status} successfully`, booth: updatedBooth });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};