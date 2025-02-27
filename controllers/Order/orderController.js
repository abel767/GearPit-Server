const Order = require('../../models/Order/orderModel');
const Product = require('../../models/Products/productModel');
const Wallet = require('../../models/wallet/walletModel'); 


const createOrder = async (req, res) => {
    try {
      console.log('Received order data:', req.body); // Debug log
  
      const { userId, items, paymentMethod, paymentId, totalAmount, shippingAddress,appliedCoupon    } = req.body; // Add paymentId here
  
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

      if (paymentMethod === 'online' && !req.body.paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required for online payments'
        });
      }
  
      if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid total amount is required'
        });
      }

      // Validate shipping address
      if (!shippingAddress || !shippingAddress.firstName || !shippingAddress.address || 
          !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode || 
          !shippingAddress.phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Complete shipping address is required'
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
  
      // Create order with shipping address
      const orderData = {
        userId,
        items,
        paymentMethod,
        totalAmount,
        shippingAddress,
        status: 'pending',
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid'
      };

      // Add paymentId if it exists
      if (paymentMethod === 'online' && paymentId) {
        orderData.paymentId = paymentId;
      }

      const order = new Order(orderData);
      await order.save();
  
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status
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

const getOrderByRazorpayId = async (req, res) => {
  try {
    const { razorpayOrderId } = req.params;
    
    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
};


const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate('items.productId', 'productName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};


const getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .select('status orderNumber createdAt');
      
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        orderedAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Get order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order status',
      error: error.message
    });
  }
};





const cancelOrder = async (req, res) => {
  try {
    console.log('Attempting to cancel order:', req.params.orderId);

    // Find order and populate product information
    const order = await Order.findById(req.params.orderId)
      .populate('items.productId');

    if (!order) {
      console.log('Order not found:', req.params.orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Current order status:', order.status);

    // Check if order can be cancelled
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in ${order.status} status`
      });
    }

    try {
      // Update order status
      order.status = 'cancelled';
      await order.save();

      // Restore product stock
      for (const item of order.items) {
        const product = item.productId;
        if (product && product.variants) {
          const variant = product.variants.id(item.variantId);
          if (variant) {
            variant.stock += item.quantity;
            await product.save();
          }
        }
      }

      // Add refund to wallet
      let refundAmount = 0
      if(order.paymentMethod === 'online'){
        try {
          let wallet = await Wallet.findOne({ userId: order.userId });
          
          if (!wallet) {
            wallet = new Wallet({ userId: order.userId, balance: 0 });
          }
  
          // Add refund amount to wallet
          wallet.balance += order.totalAmount;
          
          // Add transaction record
          wallet.transactions.push({
            type: 'credit',
            amount: order.totalAmount,
            description: `Refund for order #${order.orderNumber}`,
            orderId: order._id,
            status: 'completed'
          });
  
          await wallet.save();
        } catch (walletError) {
          console.error('Wallet refund error:', walletError);
        }
      }

      console.log('Order cancelled successfully:', req.params.orderId);
      return res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: {
          orderId: order._id,
          status: order.status,
          orderNumber: order.orderNumber,
          refundAmount: refundAmount
        }
      });

    } catch (saveError) {
      console.error('Error during order cancellation process:', saveError);
      throw saveError;
    }

  } catch (error) {
    console.error('Order cancellation failed:', {
      orderId: req.params.orderId,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};


module.exports = {
  createOrder,
  getOrderById,
  getOrders,
  cancelOrder,
  getOrderStatus,
  getOrderByRazorpayId
};