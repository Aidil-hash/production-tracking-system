// middleware/roleMiddleware.js

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
      // req.user is set by the verifyToken middleware
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: No user data' });
      }
  
      const userRole = req.user.role;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this resource' });
      }
  
      next();
    };
  }
  
  module.exports = { authorizeRoles };