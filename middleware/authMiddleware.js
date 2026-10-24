const jwt = require('jsonwebtoken');

// JWT verification middleware.
// Reads the `Authorization: Bearer <token>` header, verifies the token
// against JWT_SECRET, and attaches the decoded payload to req.user as
// { id, role, email }. Use this on any route that requires authentication.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, access denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Role-based access control middleware.
// Chain AFTER `verifyToken` so req.user is populated. Returns 403 if the
// authenticated user's role is not in the allowed set.
// Usage: router.post('/create', verifyToken, authorize('admin'), createExpo);
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

module.exports = { verifyToken, authorize };
