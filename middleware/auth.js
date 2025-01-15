// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User/userModel');

// Base token verification
const verifyToken = (req, res, next) => {
    try {
        let token = req.cookies.accessToken;

        if (!token && req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            return handleTokenRefresh(req, res, next);
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

// Token refresh handler
const handleTokenRefresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.cookies.adminRefreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token not found' });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Generate new access token with role if present
        const tokenPayload = {
            userId: user._id,
            email: user.email,
            ...(decoded.role && { role: decoded.role })
        };

        const newAccessToken = jwt.sign(
            tokenPayload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        // Set appropriate cookie name based on user type
        const cookieName = decoded.role === 'admin' ? 'adminAccessToken' : 'accessToken';

        res.cookie(cookieName, newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000
        });

        req.user = tokenPayload;
        next();
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(401).json({ message: 'Token refresh failed' });
    }
};

// Admin authentication middleware
const verifyAdmin = async (req, res, next) => {
    try {
        let token = req.cookies.adminAccessToken;

        if (!token && req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Admin access denied' });
        }

        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            if (decoded.role !== 'admin') {
                return res.status(403).json({ message: 'Unauthorized: Admin access required' });
            }
            req.user = decoded;
            next();
        } catch (err) {
            return handleTokenRefresh(req, res, next);
        }
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        return res.status(401).json({ message: 'Admin authentication failed' });
    }
};

module.exports = { verifyToken, verifyAdmin };