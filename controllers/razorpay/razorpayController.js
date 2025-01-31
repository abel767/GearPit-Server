const Razorpay = require('razorpay')
const crypto = require('crypto')
const Order = require('../../models/Order/orderModel')
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const createPaymentOrder = async(req,res)=>{
    try{
        const {amount, currency = "INR"} = req.body
        const options = {
            amount: amount * 100,
            currency,
            receipt: `receipt_${Math.random().toString(36).substring(7)}`, 
        }

        const order = await razorpay.orders.create(options)

        res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency
            }
        })
    }catch(error){
        console.error('Razorpay order creation failed', error)
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        })
    }
}

const verifyPayment = async(req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
        } = req.body;

        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Transaction not legit'
            });
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id
        });
    } catch (error) {
        console.error('Payment verification failed:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
};


const handlePaymentFailure = async (req, res) => {
  console.log('Payment failure endpoint hit', JSON.stringify(req.body, null, 2));

  try {
    const { error, orderId } = req.body;

    // Clean up the orderId - handle both formats
    const cleanOrderId = orderId?.replace('order_', '') || 
                        error?.metadata?.order_id?.replace('order_', '');

    if (!cleanOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    console.log('Looking for order with ID:', cleanOrderId);

    // Try different ways to find the order
    let order = await Order.findOne({
      $or: [
        { razorpayOrderId: cleanOrderId },
        { razorpayOrderId: `order_${cleanOrderId}` },
        { _id: /^[0-9a-fA-F]{24}$/.test(cleanOrderId) ? cleanOrderId : null }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found with provided ID'
      });
    }

    // Update order status
    order.paymentStatus = 'failed';
    order.status = 'pending';
    order.paymentRetryCount = (order.paymentRetryCount || 0) + 1;
    order.paymentRetryWindow = new Date(Date.now() + 11 * 60000);
    await order.save();

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        retryWindowEnds: order.paymentRetryWindow
      }
    });
  } catch (error) {
    console.error('Error handling payment failure:', error);
    res.status(500).json({
      success: false,
      message: 'Error handling payment failure',
      error: error.message
    });
  }
};
  



  const retryPayment = async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // First try to find order by razorpayOrderId
      let order = await Order.findOne({ razorpayOrderId: orderId });
      
      // If not found and if it's a valid ObjectId, try finding by _id
      if (!order && /^[0-9a-fA-F]{24}$/.test(orderId)) {
        order = await Order.findById(orderId);
      }
  
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
  
      // Check if order is in a valid state for retry
      if (order.paymentStatus !== 'failed' && order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Order is not eligible for payment retry'
        });
      }
  
      // Check if retry window is still active
      if (!order.paymentRetryWindow || new Date() > new Date(order.paymentRetryWindow)) {
        return res.status(400).json({
          success: false,
          message: 'Payment retry window has expired'
        });
      }
  
      // Create new Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.totalAmount * 100),
        currency: "INR",
        receipt: `retry_${order._id}`,
        notes: {
          originalOrderId: order._id.toString(),
          retryAttempt: (order.paymentRetryCount || 0) + 1
        }
      });
  
      // Update order with new Razorpay order ID
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
  
      res.json({
        success: true,
        data: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          orderNumber: order.orderNumber,
          key: process.env.RAZORPAY_KEY_ID
        }
      });
  
    } catch (error) {
      console.error('Retry payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create retry payment',
        error: error.message
      });
    }
  };
  
  
    
    const verifyRetryPayment = async (req, res) => {
      try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
    
        // Verify signature
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = shasum.digest('hex');
    
        if (digest !== razorpay_signature) {
          return res.status(400).json({
            success: false,
            message: 'Invalid payment signature'
          });
        }
    
        // Update order status
        const order = await Order.findById(orderId);
        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }
    
        order.paymentStatus = 'paid';
        order.status = 'processing';
        order.paymentId = razorpay_payment_id;
        await order.save();
    
        res.json({
          success: true,
          message: 'Payment verified successfully',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status
          }
        });
      } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
          success: false,
          message: 'Payment verification failed',
          error: error.message
        });
      }
    };
  
  module.exports ={
      createPaymentOrder,
      verifyPayment,
      handlePaymentFailure,
      retryPayment,
      verifyRetryPayment
  }