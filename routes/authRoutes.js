const express = require('express');
const router = express.Router();

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/authMiddleware');

// ===== POST /api/auth/register =====
// Hardening:
//   - `role` defaults to 'attendee' (an unauthenticated client cannot self-
//     promote to 'exhibitor' or 'admin').
//   - Self-registering as 'exhibitor' is allowed (it's a legitimate public
//     action and the companyDetails form is part of the public registration
//     flow). The frontend `Register.jsx` sends `role: 'exhibitor'` from a
//     tabbed form, so we accept it.
//   - Self-registering as 'admin' is BLOCKED unless there are zero admins in
//     the database (the bootstrap case). After the first admin exists, only
//     an authenticated admin can create another admin — enforced via the
//     optional `Authorization` header. (The frontend doesn't expose an admin-
//     creation form, but this guard makes the endpoint safe regardless.)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, companyDetails } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, password required' });
    }

    // Reject duplicate emails.
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    let assignedRole = role || 'attendee';
    if (!['admin', 'exhibitor', 'attendee'].includes(assignedRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Admin self-promotion guard: allow only when no admins exist (bootstrap).
    // After bootstrap, an admin can be created only by an authenticated admin.
    if (assignedRole === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount > 0) {
        // Verify whether the request comes from an existing admin.
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : null;
        let requesterIsAdmin = false;
        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const requester = await User.findById(decoded.id);
            requesterIsAdmin = requester?.role === 'admin';
          } catch {
            requesterIsAdmin = false;
          }
        }
        if (!requesterIsAdmin) {
          return res.status(403).json({
            message:
              'Admin accounts can only be created by an existing admin, or when no admin exists yet (bootstrap).',
          });
        }
      }
    }

    // Hash the password with the same cost as the auth controller (salt = 10).
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
      companyDetails: assignedRole === 'exhibitor' ? (companyDetails || {}) : undefined,
    });

    // Issue a 7-day JWT carrying { id, role, email }.
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Strip the password hash before returning the user document.
    const userObj = newUser.toObject();
    delete userObj.password;
    // Mongoose's .toObject() does NOT include the virtual `id` field by default.
    // The frontend uses `user.id` everywhere (and the JWT payload also uses `id`),
    // so we explicitly add it to the response to avoid `user.id === undefined`.
    userObj.id = newUser._id.toString();

    res.status(201).json({ token, user: userObj });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ===== POST /api/auth/login =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userObj = user.toObject();
    delete userObj.password;
    // Same normalization as register — the frontend reads user.id.
    userObj.id = user._id.toString();

    res.status(200).json({ token, user: userObj });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ===== POST /api/auth/reset-password =====
// Verifies the old password, then sets the new one. This is NOT a token-based
// "forgot password" flow — the caller must already know their current password.
// A real email-based reset flow would require a password_reset_token field on
// the User model + a separate /api/auth/forgot-password endpoint; not yet
// implemented.
router.post('/reset-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== PUT /api/auth/profile =====
// Updates the authenticated user's `name` and/or `companyDetails`.
// The `email` field is NOT updatable via this endpoint (it's the unique key).
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, companyDetails } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (companyDetails) updateFields.companyDetails = companyDetails;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select('-password'); // strip the password hash from the response

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Normalize the response so the frontend can read `user.id` directly.
    const userObj = updatedUser.toObject();
    userObj.id = updatedUser._id.toString();

    res.status(200).json({ user: userObj, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

module.exports = router;
