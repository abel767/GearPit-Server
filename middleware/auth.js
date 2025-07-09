const jwt = require('jsonwebtoken');
const User = require('../models/User/userModel');

// Utility function to generate tokens
const generateTokens = (user, isAdmin = false) => {
    const payload = {
        userId: user._id,
        email: user.email,
        ...(isAdmin && { role: 'admin' })
    };

    const accessToken = jwt.sign(
        payload,
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        payload,
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

// FIXED: Cookie options for production
const getCookieOptions = (isProduction) => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax', // CRITICAL: 'none' for cross-origin
    path: '/'
});

// Token refresh handler - FIXED
const handleTokenRefresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.cookies.adminRefreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ 
                message: 'Refresh token not found',
                status: 'TOKEN_MISSING'
            });
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            const user = await User.findById(decoded.userId);

            if (!user) {
                return res.status(401).json({ 
                    message: 'User not found',
                    status: 'USER_NOT_FOUND'
                });
            }

            // Check if refresh token matches stored token
            const storedToken = decoded.role === 'admin' ? 
                user.adminRefreshToken : 
                user.refreshToken;

            if (refreshToken !== storedToken) {
                return res.status(401).json({ 
                    message: 'Invalid refresh token',
                    status: 'INVALID_TOKEN'
                });
            }

            const { accessToken, refreshToken: newRefreshToken } = generateTokens(user, decoded.role === 'admin');

            // Update stored refresh token
            await User.findByIdAndUpdate(user._id, {
                [decoded.role === 'admin' ? 'adminRefreshToken' : 'refreshToken']: newRefreshToken
            });

            // Set cookies with production-ready options
            const cookieOptions = getCookieOptions(process.env.NODE_ENV === 'production');
            
            res.cookie(decoded.role === 'admin' ? 'adminAccessToken' : 'accessToken', 
                accessToken, 
                { ...cookieOptions, maxAge: 15 * 60 * 1000 }
            );

            res.cookie(decoded.role === 'admin' ? 'adminRefreshToken' : 'refreshToken',
                newRefreshToken,
                { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }
            );

            req.user = { ...decoded, newAccessToken: accessToken };
            return next();
        } catch (jwtError) {
            console.error('JWT verification failed:', jwtError);
            return res.status(401).json({ 
                message: 'Invalid refresh token',
                status: 'INVALID_TOKEN'
            });
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(401).json({ 
            message: 'Token refresh failed',
            status: 'REFRESH_FAILED'
        });
    }
};

// FIXED: Base authentication middleware
const verifyToken = async (req, res, next) => {
    try {
        // Check for access token in cookies and Authorization header
        let token = req.cookies.accessToken;
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            console.log('No access token found, attempting refresh...');
            return handleTokenRefresh(req, res, next);
        }

        try {
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
        } catch (err) {
            // Try to refresh if it's a token expiration error
            if (err.name === 'TokenExpiredError') {
                console.log('Access token expired, attempting refresh...');
                return handleTokenRefresh(req, res, next);
            }
            
            return res.status(401).json({
                message: 'Invalid access token',
                status: 'INVALID_TOKEN'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            message: 'Authentication failed',
            status: 'AUTH_FAILED'
        });
    }
};


module.exports = { 
    verifyToken, 
    verifyAdmin,
    handleTokenRefresh,
    generateTokens 
};