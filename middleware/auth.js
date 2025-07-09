const jwt = require('jsonwebtoken');
const User = require('../models/User/userModel');

// Utility function to generate tokens
const generateTokens = (user, isAdmin = false) => {
    const payload = {
        userId: user._id,
        email: user.email,
        ...(isAdmin && { role: 'admin' })
    };

    return {
        accessToken: jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' }),
        refreshToken: jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
    };
};

// Enhanced token refresh handler
const handleTokenRefresh = async (req, res) => {
    try {
        // Get refresh token from multiple sources
        const refreshToken = req.cookies.refreshToken 
                          || req.headers['x-refresh-token']
                          || req.body.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                message: 'Refresh token not found',
                status: 'TOKEN_MISSING'
            });
        }

        // Verify token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || refreshToken !== user.refreshToken) {
            return res.status(401).json({
                message: 'Invalid refresh token',
                status: 'INVALID_TOKEN'
            });
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user, decoded.role === 'admin');

        // Update user's refresh token
        await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

        // Set cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.gearpit.netlify.app' : 'localhost'
        };

        res.cookie('accessToken', accessToken, { 
            ...cookieOptions, 
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', newRefreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.json({
            status: 'success',
            accessToken,
            refreshToken: newRefreshToken
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Refresh token expired',
                status: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(401).json({
            message: 'Invalid refresh token',
            status: 'INVALID_TOKEN'
        });
    }
};

// Verify token middleware
const verifyToken = async (req, res, next) => {
    try {
        // Get token from cookies, then Authorization header
        let token = req.cookies.accessToken;
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                message: 'Access token missing',
                status: 'TOKEN_MISSING'
            });
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: 'User not found',
                status: 'USER_NOT_FOUND'
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                message: 'Account is blocked',
                status: 'ACCOUNT_BLOCKED'
            });
        }

        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            // Let client handle token refresh
            return res.status(401).json({
                message: 'Access token expired',
                status: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(401).json({
            message: 'Invalid access token',
            status: 'INVALID_TOKEN'
        });
    }
};


module.exports = {
    generateTokens,
    handleTokenRefresh,
    verifyToken,
    verifyAdmin: async (req, res, next) => {
        try {
            await verifyToken(req, res, () => {
                if (!req.user.role || req.user.role !== 'admin') {
                    return res.status(403).json({
                        message: 'Admin access required',
                        status: 'UNAUTHORIZED_ROLE'
                    });
                }
                next();
            });
        } catch (error) {
            next(error);
        }
    }
};