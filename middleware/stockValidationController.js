const Product = require('../models/Products/productModel')

const validateStock = async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid items format'
            });
        }

        const stockValidation = await Promise.all(items.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product) {
                return {
                    productId: item.productId,
                    valid: false,
                    message: 'Product not found'
                };
            }

            const variant = product.variants.id(item.variantId);
            if (!variant) {
                return {
                    productId: item.productId,
                    valid: false,
                    message: 'Variant not found'
                };
            }

            if (variant.stock < item.quantity) {
                return {
                    productId: item.productId,
                    variantId: item.variantId,
                    valid: false,
                    available: variant.stock,
                    message: `Only ${variant.stock} items available for ${product.productName} - ${variant.size}` // Updated error message
                };
            }

            return {
                productId: item.productId,
                variantId: item.variantId,
                valid: true,
                available: variant.stock
            };
        }));

        const invalidItems = stockValidation.filter(item => !item.valid);

        res.json({
            success: true,
            valid: invalidItems.length === 0,
            items: stockValidation,
            invalidItems
        });
    } catch (error) {
        console.error('Stock validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate stock',
            error: error.message
        });
    }
};


module.exports = { validateStock };