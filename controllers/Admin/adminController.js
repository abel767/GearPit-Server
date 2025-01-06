const express = require("express");
const User = require("../../models/User/userModel");
const bcrypt = require('bcrypt');
require("dotenv").config();
const jwt = require('jsonwebtoken');


const generateAdminAccessToken = (user) => {
    return jwt.sign(
        { 
            userId: user._id, 
            email: user.email,
            role: 'admin'  // Add role to token
        }, 
        process.env.ACCESS_TOKEN_SECRET, 
        { expiresIn: '15m' }
    );
};

const generateAdminRefreshToken = (user) => {
    return jwt.sign(
        { 
            userId: user._id, 
            email: user.email,
            role: 'admin'  // Add role to token
        }, 
        process.env.REFRESH_TOKEN_SECRET, 
        { expiresIn: '7d' }
    );
};



const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const adminInfo = await User.findOne({ email });

        if (!adminInfo) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (!adminInfo.isAdmin) {
            return res.status(401).json({ message: "Unauthorized access" });
        }

        // Compare password with salt
        const isPasswordValid = await bcrypt.compare(password + adminInfo.salt, adminInfo.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password" });
        }

        // Generate tokens
        const accessToken = generateAdminAccessToken(adminInfo);
        const refreshToken = generateAdminRefreshToken(adminInfo);

        // Save refresh token in the database
        await User.updateOne({ _id: adminInfo._id }, {
            adminRefreshToken: refreshToken  // Store in separate field
        });


        // Send cookies
        res.cookie('adminAccessToken', accessToken, {
            httpOnly: true,
            secure: false,  // Change to true in production for HTTPS
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('adminRefreshToken', refreshToken, {
            httpOnly: true,
            secure: false,  // Change to true in production for HTTPS
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Respond with user data
        res.json({
            status: "VERIFIED",
            message: "Admin login success",
            user: {
                id: adminInfo._id,
                name: adminInfo.username,
                email: adminInfo.email,
                image: adminInfo.profileImage,
                phone: adminInfo.phone
            },
            role: "admin"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};


const getUserData = async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};




const isBlock = async (req, res) => {
    try{
        const userId = req.params.id
        const {isBlocked} = req.body

        if(!userId){
            return res.status(400).json({message: 'User ID is required'})
        }

        const user = await User.findById(userId)
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }

        const updateUser = await User.findByIdAndUpdate(
            userId,
            {
                isBlocked
            },
            {new: true}
        )

        res.status(200).json({
            status: 'success',
            message: isBlocked? 'User Blocked successfully' : 'User unblocked successfully',
            user: updateUser
        })
    }catch(error){
        console.error('Error in isBlock', error)
        res.status(500).json({message: 'Error updating user status'})
    }
};



const adminLogout = async (req, res) => {
    try {
        res.clearCookie('admin_access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        res.clearCookie('admin_refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        // Clear admin refresh token from database
        const adminId = req.user?.userId;
        if (adminId) {
            await User.updateOne(
                { _id: adminId },
                { $unset: { adminRefreshToken: "" } }
            );
        }

        res.json({ message: 'Admin logged out successfully' });
    } catch (error) {
        console.error('Admin logout error:', error);
        res.status(500).json({ message: 'Admin logout failed' });
    }
};



module.exports = {
    adminLogin,
    getUserData,
    isBlock,
    adminLogout
};
