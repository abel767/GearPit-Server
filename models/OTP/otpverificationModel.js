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
     CreatedAt: {
        type: Date,
        required: true
     },
     exporesAt: {
        type: Date,
        required: true
     }
})

module.exports = mongoose.models.otpverification || mongoose.models('otpVerification', otpverificationSchema)
