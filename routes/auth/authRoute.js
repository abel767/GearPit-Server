const express = require("express");
const passport = require("passport");
const jwt = require('jsonwebtoken');
const authRoute = express.Router();

// Session verification middleware
const verifySession = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({
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

            // Generate tokens using the same format as your auth middleware
            const accessToken = jwt.sign(
                { 
                    userId: req.user._id, 
                    email: req.user.email,
                    isGoogleUser: true
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                { 
                    userId: req.user._id, 
                    email: req.user.email,
                    isGoogleUser: true
                },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '7d' }
            );

            // Set both tokens as cookies
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/'
            };

            res.cookie('accessToken', accessToken, {
                ...cookieOptions,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                ...cookieOptions,
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Store tokens in session
            req.session.accessToken = accessToken;
            req.session.refreshToken = refreshToken;
            
            // Save session and redirect
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

// Login success endpoint
authRoute.get('/login/success', verifySession, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: true,
                message: 'Not authenticated'
            });
        }

        // Use existing token from cookie or generate new one
        const accessToken = req.cookies.accessToken || jwt.sign(
            { 
                userId: req.user._id, 
                email: req.user.email,
                isGoogleUser: true
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