const Order = require('../../models/Order/orderModel');
const Product = require('../../models/Products/productModel');

const createOrder = async (req, res) => {
    try {
      const { userId, items, paymentMethod, totalAmount } = req.body;
  
      // Log incoming request data for debugging
      console.log('Creating order with:', req.body);
  
      // Validate required fields
      if (!userId || !items || !items.length || !paymentMethod || !totalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields in the request body',
        });
      }
  
      // Validate stock and update quantities
      for (const item of items) {
        const product = await Product.findById(item.productId);
        const variant = product.variants.id(item.variantId);
  
        if (!variant) {
          return res.status(400).json({
            success: false,
            message: `Variant not found for product ${product.productName}`,
          });
        }
  
        if (variant.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.productName} - ${variant.size}`,
          });
        }
  
        // Decrease stock
        variant.stock -= item.quantity;
        await product.save();
      }
  
      // Create order
      const order = new Order({
        userId,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod,
        totalAmount,
        status: 'pending',
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      });
  
      await order.save();
  
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          orderId: order._id,
          orderNumber: `GPI${Math.floor(100000 + Math.random() * 900000)}`,
        },
      });
    } catch (error) {
      console.error('Order creation error:', error); // Log error details
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: error.message,
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
