const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    salt:{
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
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
    isGoogleUSer: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: null
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