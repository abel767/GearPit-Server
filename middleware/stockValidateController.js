const Product = require('../models/Products/productModel'); // Adjust path as needed

const validateStock = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format'
      });
    }

    // Validate each item's stock
    const stockValidation = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.productId);
        
        if (!product) {
          return {
            ...item,
            isValid: false,
            availableStock: 0,
            message: 'Product not found'
          };
        }

        const variant = product.variants.find(v => v._id.toString() === item.variantId);
        
        if (!variant) {
          return {
            ...item,
            isValid: false,
            availableStock: 0,
            message: 'Variant not found'
          };
        }

        return {
          ...item,
          name: product.name,
          size: variant.size,
          isValid: variant.stock >= item.quantity,
          availableStock: variant.stock,
          requestedQuantity: item.quantity
        };
      })
    );

    const invalidItems = stockValidation.filter(item => !item.isValid);

    if (invalidItems.length > 0) {
      return res.json({
        success: false,
        message: 'Some items are out of stock',
        items: invalidItems
      });
    }

    return res.json({
      success: true,
      message: 'All items are in stock'
    });
  } catch (error) {
    console.error('Stock validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = { validateStock };