const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    userName: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: function() { return !this.isGoogleUser; } // Only required for non-Google users
    },
    salt:{
        type: String,
        required: function() { return !this.isGoogleUser; }
    },
    phone: {
        type: String,
        required: false
    },
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
    googleId: {
        type: String,
        default: null
    },
    isGoogleUser: {
        type: Boolean,
        default: false
    },
    profileImage: {  // Updated field for storing image URL
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