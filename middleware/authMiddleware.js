require("dotenv").config();
const jwt = require("jsonwebtoken");

// attachUser: parses cookie token (if present) and attaches req.user + res.locals.user (for EJS)
const attachUser = (req, res, next) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) {
      req.user = null;
      res.locals.user = null;
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    res.locals.user = req.user; // handy for EJS templates
    next();
  } catch (err) {
    req.user = null;
    res.locals.user = null;
    next();
  }
};

// protect: API-style middleware (use in API routes). Optional `roles` e.g. ['admin']
const protect = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = { attachUser, protect };
