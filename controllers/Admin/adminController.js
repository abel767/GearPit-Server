const express = require("express");
const User = require("../../models/User/userModel");
const bcrypt = require('bcrypt');
require("dotenv").config();
const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
    return jwt.sign(
        { 
            userId: user._id, 
            email: user.email 
        }, 
        process.env.ACCESS_TOKEN_SECRET, 
        { expiresIn: '15m' }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { 
            userId: user._id, 
            email: user.email 
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
        const accessToken = generateAccessToken(adminInfo);
        const refreshToken = generateRefreshToken(adminInfo);

        // Save refresh token in the database
        await User.updateOne({ _id: adminInfo._id }, {
            refreshToken: refreshToken 
        });

        // Send cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: false,  // Change to true in production for HTTPS
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
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
    try {
        const userId = req.params.id;
        const { isBlocked } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { isBlocked },
            { new: true }
        );

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating user status" });
    }
};

module.exports = {
    adminLogin,
    getUserData,
    isBlock,
};
