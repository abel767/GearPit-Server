const express = require("express");
const passport = require("passport");
const jwt = require('jsonwebtoken');
const authRoute = express.Router();
const checkIfBlocked = require('../../middleware/checkIfBlocked');

// Session verification middleware
const verifySession = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(403).json({
        error: true,
        message: 'Not authenticated'
    });
};

// Initialize Google OAuth route
authRoute.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback
authRoute.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: 'http://localhost:5173/user/login',
        session: true
    }),
    async (req, res) => {
        try {
            if (!req.user) {
                return res.redirect('http://localhost:5173/user/login');
            }

            // Generate access token
            const accessToken = jwt.sign(
                { 
                    userId: req.user._id, 
                    email: req.user.email 
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            );

            // Set cookies with appropriate options
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            // Store token in session
            req.session.accessToken = accessToken;
            
            // Save session explicitly
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.redirect('http://localhost:5173/user/login');
                }
                res.redirect('http://localhost:5173/user/home');
            });
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect('http://localhost:5173/user/login');
        }
    }
);

// Modified login success endpoint
authRoute.get('/login/success', verifySession, checkIfBlocked, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(403).json({
                error: true,
                message: 'Not authenticated'
            });
        }

        // Get token from session or generate new one
        const accessToken = req.session.accessToken || jwt.sign(
            { 
                userId: req.user._id, 
                email: req.user.email 
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({
            error: false,
            message: 'Successfully logged in',
            user: { 
                id: req.user._id,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                email: req.user.email,
                profileImage: req.user.profileImage,
                isAdmin: req.user.isAdmin
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

module.exports = authRoute;