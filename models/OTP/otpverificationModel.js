const mongoose = require('mongoose')

const otpverificationSchema = new mongoose.Schema({
     userId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
     },
     otp:{
        type:String,
        required:true
     },
     createdAt: {
        type: Date,
        required: true
     },
     expiresAt : {
        type: Date,
        required: true
     }
})

module.exports = mongoose.models.otpverification || mongoose.model('otpVerification', otpverificationSchema)
