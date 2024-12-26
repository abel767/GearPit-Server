const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'category',
    required: true,
  },
  brand: {
    type: String,
  },
  images: {
    type: [String],
    default: [],
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  description: {
    type: String,
  },
  variants: [{
    size: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
  }]
  
}, {
  timestamps: true  
});

module.exports = mongoose.models.Product || mongoose.model("product", productSchema);

