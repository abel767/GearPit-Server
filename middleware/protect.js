const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User/userModel'); // Ensure you have the User model imported

// Middleware to protect routes
const protect = asyncHandler(async (req, res, next) => {
  // Use the consistent token name
  const token = req.cookies.accessToken; // Replace 'accessToken' with the name you're using

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  try {
    // Verify the token with the secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user to the request
    req.user = await User.findById(decoded.userId).select('-password');
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
});

module.exports = { protect };
