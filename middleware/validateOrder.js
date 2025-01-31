const Product = require('../models/Products/productModel');

const validateOrder = async (req, res, next) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items array'
      });
    }

    const invalidItems = [];

    for (const item of items) {
      const { productId, variantId, quantity } = item;

      // Find product and check if it exists and is not blocked
      const product = await Product.findById(productId);
      if (!product || product.isBlocked) {
        invalidItems.push({
          productId,
          reason: !product ? 'Product not found' : 'Product is unavailable'
        });
        continue;
      }

      // Find variant and check stock
      const variant = product.variants.id(variantId);
      if (!variant) {
        invalidItems.push({
          productId,
          reason: 'Variant not found'
        });
        continue;
      }

      if (variant.stock < quantity) {
        invalidItems.push({
          productId,
          variantId,
          availableStock: variant.stock,
          requestedQuantity: quantity,
          reason: 'Insufficient stock'
        });
        continue;
      }
    }

    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some items are no longer available',
        invalidItems
      });
    }

    // All items are valid
    next();
  } catch (error) {
    console.error('Order validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating order items',
      error: error.message
    });
  }
};

// Separate validation endpoint for frontend checks
const validateCartItems = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items array'
      });
    }

    const stockUpdates = [];
    const outOfStockItems = [];
    const validItems = [];

    for (const item of items) {
      const { productId, variantId, quantity } = item;

      const product = await Product.findById(productId).select('productName variants isBlocked');
      
      if (!product || product.isBlocked) {
        outOfStockItems.push({
          productId,
          name: product?.productName || 'Unknown Product',
          reason: !product ? 'Product not found' : 'Product is unavailable'
        });
        continue;
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        outOfStockItems.push({
          productId,
          name: product.productName,
          reason: 'Selected variant is no longer available'
        });
        continue;
      }

      if (variant.stock === 0) {
        outOfStockItems.push({
          productId,
          variantId,
          name: product.productName,
          size: variant.size,
          reason: 'Out of stock'
        });
        continue;
      }

      if (variant.stock < quantity) {
        stockUpdates.push({
          productId,
          variantId,
          name: product.productName,
          size: variant.size,
          currentStock: variant.stock,
          requestedQuantity: quantity
        });
      }

      validItems.push({
        productId,
        variantId,
        quantity: Math.min(quantity, variant.stock),
        name: product.productName,
        size: variant.size,
        currentStock: variant.stock,
        price: variant.finalPrice || variant.price
      });
    }

    return res.json({
      success: true,
      hasChanges: outOfStockItems.length > 0 || stockUpdates.length > 0,
      outOfStockItems,
      stockUpdates,
      validItems,
      message: outOfStockItems.length > 0 
        ? 'Some items are out of stock'
        : stockUpdates.length > 0 
        ? 'Some items have limited stock'
        : 'All items are available'
    });
    
  } catch (error) {
    console.error('Cart validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating cart items',
      error: error.message
    });
  }
};


module.exports = {
  validateOrder,
  validateCartItems
};