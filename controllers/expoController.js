const Expo = require('../models/Expo');

// Parse optional `?page=` and `?limit=` query params. Both clamped to safe bounds.
// When neither is provided, the endpoint returns the full list (preserves the
// original behaviour for callers that haven't opted into pagination).
const parsePagination = (query) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (Number.isNaN(page) && Number.isNaN(limit)) {
    return { paginated: false, skip: 0, limit: 0 };
  }
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100; // cap to prevent abuse
  return { paginated: true, skip: (page - 1) * limit, limit };
};

// Create a new Expo (Admin only — route-level guard is in expoRoutes.js)
// Hardening: `createdBy` is now sourced from the JWT (req.user.id), not from
// the request body. This prevents a caller from forging another user as the
// author of the expo.
exports.createExpo = async (req, res) => {
  try {
    const { title, description, theme, location, date } = req.body;

    if (!title || !description || !location || !date) {
      return res.status(400).json({ message: 'title, description, location, date are required' });
    }

    const newExpo = new Expo({
      title,
      description,
      theme,
      location,
      date,
      createdBy: req.user.id, // ← sourced from JWT, not req.body
    });

    await newExpo.save();

    // Broadcast the new expo to all connected clients so the frontend expo list
    // updates in real time. Mirrors how messageController emits NEW_CHAT_MESSAGE.
    const io = req.app.get('io');
    if (io) {
      io.emit('EXPO_CREATED', newExpo);
    }

    res.status(201).json({ message: 'Expo created successfully', expo: newExpo });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all Expos. Supports optional pagination via ?page=&limit=.
// When neither query param is provided, returns the full list (back-compat).
// When paginated, the response shape is { page, limit, total, totalPages, expos }.
exports.getAllExpos = async (req, res) => {
  try {
    const { paginated, skip, limit } = parsePagination(req.query);
    const baseQuery = Expo.find().sort({ date: 1 });

    if (!paginated) {
      const expos = await baseQuery.exec();
      return res.status(200).json(expos);
    }

    const [expos, total] = await Promise.all([
      baseQuery.skip(skip).limit(limit).exec(),
      Expo.countDocuments(),
    ]);
    return res.status(200).json({
      page: Math.floor(skip / limit) + 1,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      expos,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Expo (Edit)
exports.updateExpo = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    // Never allow `createdBy` to be overwritten via the update endpoint.
    delete updatedData.createdBy;

    const expo = await Expo.findByIdAndUpdate(id, updatedData, { new: true });
    if (!expo) {
      return res.status(404).json({ message: 'Expo not found' });
    }

    res.status(200).json({ message: 'Expo updated successfully', expo });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Expo
exports.deleteExpo = async (req, res) => {
  try {
    const { id } = req.params;

    const expo = await Expo.findByIdAndDelete(id);
    if (!expo) {
      return res.status(404).json({ message: 'Expo not found' });
    }

    res.status(200).json({ message: 'Expo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
