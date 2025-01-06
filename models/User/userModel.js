const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: false,
    },
    userName: {
        type: String,
        required: false
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: function() { return !this.isGoogleUser; }
    },
    salt:{
        type: String,
        required: function() { return !this.isGoogleUser; }
    },
    phone: {
        type: String,
        required: false
    },
    addresses:[{
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        pincode: {
            type: String,
            required: true
        },
        phoneNumber:{
            type:String,
            required:true
        }
    }],
    verified: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String
    },
    adminRefreshToken: {     // Added new field for admin refresh token
        type: String
    },
    googleId: {
        type: String,
        default: null
    },
    isGoogleUser: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: null,
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
},
{
    timestamps: true
})

module.exports = mongoose.models.User || mongoose.model('User', userSchema)