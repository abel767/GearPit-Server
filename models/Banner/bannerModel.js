const mongoose = require('mongoose')

const bannerSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    imageUrl:{
        type: String,
        requierd: true,
    },
    link: {
        type:String
    },
    isActive:{
        type: Boolean,
        default: true,
    },
    displayOrder: {
        type: Number,
        default: 0
    }
},{timestamps: true})

module.exports = mongoose.model('Banner', bannerSchema)

