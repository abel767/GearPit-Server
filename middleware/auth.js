const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    try {
        // Check for token in cookies first
        let token = req.cookies.accessToken;

        // If no cookie, check Authorization header
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
            // Token verification failed, try to refresh
            return handleTokenRefresh(req, res, next);
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

const handleTokenRefresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token not found' });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Generate new tokens
        const newAccessToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        // Set new access token in cookie
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000
        });

        // Update request with new user info
        req.user = { userId: user._id, email: user.email };
        next();
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(401).json({ message: 'Token refresh failed' });
    }
};

module.exports = { verifyToken };