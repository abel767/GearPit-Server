const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
    },
    offer: {
        percentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        isActive: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Category || mongoose.model('category', categorySchema);