const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        index: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: true,
    },
    brand: {
        type: String,
        index: true
    },
    images: {
        type: [String],
        default: [],
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
        index: true
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
    },
    variants: [{
        size: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        discount: { type: Number, default: 0, min: 0, max: 100 },
        finalPrice: { type: Number, min: 0 },
        stock: { type: Number, required: true, min: 0 },
    }]
}, {
    timestamps: true
});

productSchema.index({
    productName: 'text',
    description: 'text',
    brand: 'text'
})

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);


