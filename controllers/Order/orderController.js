const Order = require('../../models/Order/orderModel');
const Product = require('../../models/Products/productModel');

const createOrder = async (req, res) => {
    try {
      console.log('Received order data:', req.body); // Debug log
  
      const { userId, items, paymentMethod, totalAmount } = req.body;
  
      // Enhanced validation
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
  
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order must contain at least one item'
        });
      }
  
      if (!paymentMethod || !['cod', 'online'].includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Valid payment method is required (cod or online)'
        });
      }
  
      if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid total amount is required'
        });
      }
  
      // Validate items and check stock
      for (const item of items) {
        if (!item.productId || !item.variantId || !item.quantity || !item.price) {
          return res.status(400).json({
            success: false,
            message: 'Each item must have productId, variantId, quantity, and price'
          });
        }
  
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${item.productId}`
          });
        }
  
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          return res.status(400).json({
            success: false,
            message: `Variant not found for product ${product.productName}`
          });
        }
  
        if (variant.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.productName} - ${variant.size}`
          });
        }
  
        // Update stock
        variant.stock -= item.quantity;
        await product.save();
      }
  
      // Create order
      const order = new Order({
        userId,
        items,
        paymentMethod,
        totalAmount,
        status: 'pending',
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid'
      });
  
      await order.save();
  
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber
        }
      });
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: error.message
      });
    }
  };

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('items.productId', 'productName images')
      .populate('userId', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getOrderById,
};
