const express = require("express");
const passport = require("passport");
const jwt = require('jsonwebtoken');
const User = require('../../models/User/userModel'); // Adjust path as needed
const authRoute = express.Router();

// Session verification middleware
const verifySession = async (req, res, next) => {
    try {
        // Check both session and token authentication
        if (req.isAuthenticated() || req.cookies.accessToken) {
            return next();
        }
        res.status(401).json({
            error: true,
            message: 'Not authenticated'
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: 'Authentication check failed'
        });
    }
};

// Initialize Google OAuth route
authRoute.get('/google', (req, res, next) => {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  });

// Google OAuth callback
authRoute.get('/google/callback',
    passport.authenticate('google', { 
      failureRedirect: '/user/login',
      session: true
    }),
    async (req, res) => {
      try {
        if (!req.user) {
          console.log('No user found in request');
          return res.redirect('http://localhost:5173/user/login');
        }
  
        console.log('User authenticated:', req.user._id); // Add logging
  
        const accessToken = jwt.sign(
          { userId: req.user._id, email: req.user.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );
  
        const refreshToken = jwt.sign(
          { userId: req.user._id, email: req.user.email },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: '7d' }
        );
  
        // Update user's refresh token in database
        await User.findByIdAndUpdate(req.user._id, { refreshToken });
  
        // Set cookies with explicit domain
        res.cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: false, // Set to true in production
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60 * 1000
        });
  
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: false, // Set to true in production
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
  
        console.log('Redirecting to home page'); // Add logging
        return res.redirect('http://localhost:5173/user/home');
      } catch (error) {
        console.error('Google auth callback error:', error);
        return res.redirect('http://localhost:5173/user/login');
      }
    }
  );
// Login success endpoint with token verification
authRoute.get('/login/success', verifySession, async (req, res) => {
    try {
        // Get user either from session or token
        const user = req.user || await getUserFromToken(req.cookies.accessToken);

        if (!user) {
            return res.status(401).json({
                error: true,
                message: 'Not authenticated'
            });
        }

        // Use existing token from cookie or generate new one
        const accessToken = req.cookies.accessToken || jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                isGoogleUser: user.isGoogleUser || false
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({
            error: false,
            message: 'Successfully logged in',
            user: { 
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profileImage: user.profileImage,
                isAdmin: user.isAdmin,
                verified: user.verified
            },
            token: accessToken
        });
    } catch (error) {
        console.error('Login success error:', error);
        res.status(500).json({
            error: true,
            message: 'Server error during login'
        });
    }
});

// Helper function to get user from token
async function getUserFromToken(token) {
    try {
        if (!token) return null;
        
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        return await User.findById(decoded.userId);
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// Logout route
authRoute.get('/logout', (req, res) => {
    try {
        // Clear session
        req.logout(() => {
            // Clear cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            
            // Destroy session
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
                res.redirect(`${process.env.FRONTEND_URL}/user/login`);
            });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: true,
            message: 'Error during logout'
        });
    }
});

module.exports = authRoute;