// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || 'your_secret_key'; // Use the same secretKey as in authController

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // Expecting a header in the format "Bearer <token>"
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Malformed token' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = decoded; // Attach decoded token data (e.g., id, role, name) to the request
    next();
  });
};

module.exports = { verifyToken };