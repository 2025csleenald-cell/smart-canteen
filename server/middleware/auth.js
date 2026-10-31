const jwt = require('jsonwebtoken');

exports.requireAuth = (role) => (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in first.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== role) return res.status(403).json({ message: 'You do not have access to this.' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Your session expired. Please log in again.' });
  }
};

// lets async route handlers pass errors to Express
exports.ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
