const User = require('../models/User/userModel')

const checkIfBlocked = async (req, res, next) => {
    try {
        // Use req.user if Passport.js stores the user object here
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const user = await User.findById(userId);

        if (user && user.isBlocked) {
            // Clear the cookies to log out the user
            res.clearCookie('accessToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
        }

        next();  // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Error in checkIfBlocked middleware:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = checkIfBlocked;
