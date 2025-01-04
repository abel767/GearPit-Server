const jwt = require('jsonwebtoken');
const User = require('../models/User/userModel'); // Ensure you have the User model imported

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = await User.findById(decoded.userId);
      return next();
    }
    
    if (req.isAuthenticated()) {
      return next();
    }
    
    return res.status(401).json({ message: 'Please log in to continue' });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid authentication' });
  }
};


module.exports = { authMiddleware };
