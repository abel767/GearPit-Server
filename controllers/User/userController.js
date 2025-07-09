const User = require('../../models/User/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const otpVerification = require('../../models/OTP/otpverificationModel');
const crypto = require('crypto');
const mongoose = require('mongoose')

// Hashing the password securely with salt 
const securePassword = async (password) => {
    try {
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password + salt, saltRounds);

        return { hashedPassword, salt };
    } catch (error) {
        console.error('Error while securing the password:', error);
        throw new Error('Error while securing the password');
    }
};

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

// Generate Access Token
const generateAccessToken = (user) => {
    return jwt.sign(
        { userId: user._id, email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    );
};

// Generate Refresh Token
const generateRefreshToken = (user) => {
    return jwt.sign(
        { userId: user._id, email: user.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );
};

// Refresh Token Controller
const refreshTokenController = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                message: 'Refresh token not found',
                status: 'TOKEN_MISSING'
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: 'User not found',
                status: 'USER_NOT_FOUND'
            });
        }

        // Verify the refresh token matches what's stored
        if (refreshToken !== user.refreshToken) {
            return res.status(401).json({
                message: 'Invalid refresh token',
                status: 'INVALID_TOKEN'
            });
        }

        // Generate new tokens
        const accessToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        const newRefreshToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // Update refresh token in database
        await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

        // Set cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            status: 'success',
            message: 'Tokens refreshed successfully',
            accessToken
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({
            message: 'Invalid refresh token',
            status: 'INVALID_TOKEN'
        });
    }
};
// Sign-up
const signUp = async (req, res) => {
    try {
        const { firstName, lastName, userName, password, email, phone, profileImage } = req.body;

        const isEmailExists = await User.findOne({ email });
        if (isEmailExists) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const { hashedPassword, salt } = await securePassword(password);

        const user = new User({
            firstName,
            lastName,
            userName,
            email,
            password: hashedPassword,
            salt,
            phone,
            profileImage
        });

        await user.save();
        console.log('User created successfully');
        await sendOTPVerificationEmail({ id: user.id, email: user.email });

        res.status(201).json({
            message: 'Your account has been registered successfully. OTP sent to email.',
            userId: user._id,
            email,
            profileImage: user.profileImage
        });

    } catch (error) {
        console.error('Sign-up error:', error.message);
        res.status(500).json({ message: error.message || 'Something went wrong' });
    }
    
    
};



// Send OTP Verification Email
const sendOTPVerificationEmail = async ({ id, email }) => {
    try {
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
        const hashedOTP = await bcrypt.hash(otp, 10);

        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: 'Verify Your Email',
            text: `Your OTP is ${otp}`,
        };

        const newOTPVerification = new otpVerification({
            userId: id,
            otp: hashedOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000, // 5 minutes
        });

        await newOTPVerification.save();

        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error('Email sending error:', emailError.message);
            throw new Error(`Failed to send OTP. Reason: ${emailError.message}`);
        }

        console.log('OTP verification email sent successfully');
    } catch (error) {
        console.error('Error sending OTP:', error.message);
        throw new Error('Error sending OTP verification email');
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({ message: 'UserId or OTP is missing' });
        }

        const otpVerificationRecord = await otpVerification.findOne({ userId });
        if (!otpVerificationRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const { otp: hashedOTP, expiresAt } = otpVerificationRecord;

        if (expiresAt < Date.now()) {
            await otpVerification.deleteOne({ userId });
            return res.status(400).json({ message: 'OTP has expired. Please try again.' });
        }

        const validOTP = await bcrypt.compare(otp, hashedOTP);
        if (!validOTP) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        await User.updateOne({ _id: userId }, { verified: true });
        await otpVerification.deleteOne({ userId });

        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Error verifying OTP:', error.message);
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

// Resend OTP
const resendOTP = async (req, res) => {
    try {
        const { userId, email } = req.body;

        if (!userId || !email) {
            throw new Error('Empty OTP details are not allowed');
        }

        await otpVerification.deleteMany({ userId });
        await sendOTPVerificationEmail({ id: userId, email });

        res.status(200).json({
            status: 'Success',
            message: 'New OTP sent successfully',
        });
    } catch (error) {
        res.json({ status: 'Failed', message: error.message });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'Your account is blocked. Contact support.' });
        }

        const isPasswordValid = await bcrypt.compare(password + user.salt, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Update refresh token in database
        await User.findByIdAndUpdate(user._id, { refreshToken });

    // Set cookies
    res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Important for cross-site
    domain: process.env.NODE_ENV === 'production' ? '.gearpit.netlify.app' : 'localhost',
    path: '/',
    maxAge: 15 * 60 * 1000
});

res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.gearpit.netlify.app' : 'localhost',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
});

        // Send response
        res.json({
            status: 'VERIFIED',
            message: 'User login successful',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                userName: user.userName,
                email: user.email,
                phone: user.phone,
                profileImage: user.profileImage,
                isAdmin: user.isAdmin,
                isBlocked: user.isBlocked,
                verified: user.verified
            },
            accessToken // Include the token in the response
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Something went wrong during login' });
    }
};



// Get User Data
const getUserData = async (req, res) => {
    try {
        
        const id = req.params.id;
        if(!id || !mongoose.Types.ObjectId.isValid(id)){
            console.log('Invalid or missing ID', id)
            return res.status(400).json({message: 'invalid pr missing user ID'})
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            userName: user.userName,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            isAdmin: user.isAdmin,
            verified: user.verified
        });
    } catch (error) {
        console.error('Error fetching user data:', error.message);
        res.status(500).json({ message: 'Error fetching user data' });
    }
};

const checkBlockStatus = async (req, res) => {
    try {
        const userId = req.params.userId;
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                message: 'Invalid user ID',
                isBlocked: false 
            });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found',
                isBlocked: false 
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({ 
                message: 'User is blocked',
                isBlocked: true 
            });
        }

        return res.json({ 
            message: 'User is not blocked',
            isBlocked: false 
        });
    } catch (error) {
        console.error('Error checking block status:', error);
        return res.status(500).json({ 
            message: 'Error checking block status',
            isBlocked: false 
        });
    }
};

const logout = async (req, res) => {
    try {
        // Clear JWT tokens
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        // If this was a Google OAuth session, clear it too
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                }
            });
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Logout failed' });
    }
};



module.exports = {
    signUp,
    verifyOTP,
    resendOTP,
    refreshTokenController,
    login,
    checkBlockStatus,
    logout,
    getUserData,
};