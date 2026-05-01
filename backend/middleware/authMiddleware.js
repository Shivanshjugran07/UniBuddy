const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "unibuddy_super_secret_2026";

function authMiddleware(req, res, next) {
  let authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "No token. Access denied ❌" });
  }

  let token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  try {
    let decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token ❌" });
  }
}

module.exports = authMiddleware;
