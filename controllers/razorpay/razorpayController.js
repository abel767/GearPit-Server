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
    const { error, orderData } = req.body;
    
    // Get the clean order ID from the error metadata
    const razorpayOrderId = error?.metadata?.order_id;
    if (!razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay Order ID is required'
      });
    }

    console.log('Looking for order with razorpayOrderId:', razorpayOrderId);

    // Find or create order
    let order = await Order.findOne({ razorpayOrderId });

    if (!order && orderData) {
      // Create a new order if it doesn't exist
      order = new Order({
        ...orderData,
        razorpayOrderId,
        paymentStatus: 'failed',
        status: 'pending',
        paymentRetryCount: 0
      });
      await order.save();
      console.log('Created new order:', order._id);
    } else if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found and no order data provided'
      });
    } else {
      // Update existing order
      order.paymentStatus = 'failed';
      order.status = 'pending';
      order.paymentRetryCount = (order.paymentRetryCount || 0) + 1;
      await order.save();
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        razorpayOrderId: order.razorpayOrderId,
        orderNumber: order.orderNumber
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
    
    // Check if orderId is a Razorpay order ID
    let order;
    if (orderId.startsWith('order_')) {
      order = await Order.findOne({ razorpayOrderId: orderId });
    } else {
      // Try to find by MongoDB _id
      order = await Order.findById(orderId);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is in a valid state for retry
    if (order.paymentStatus !== 'failed' || order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order is not eligible for payment retry'
      });
    }

    // If there's no razorpayOrderId or if it's expired, create a new one
    let razorpayOrder;
    try {
      if (order.razorpayOrderId) {
        // Try to fetch existing order
        razorpayOrder = await razorpay.orders.fetch(order.razorpayOrderId);
        
        // Check if order is still valid (not expired or paid)
        if (razorpayOrder.status === 'paid' || razorpayOrder.status === 'expired') {
          throw new Error('Order needs to be recreated');
        }
      } else {
        throw new Error('No existing order');
      }
    } catch (error) {
      // Create new Razorpay order if fetch fails or order is invalid
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.totalAmount * 100),
        currency: "INR",
        receipt: `retry_${order._id}`,
        notes: {
          originalOrderId: order._id.toString()
        }
      });
      
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        razorpayOrderId: order.razorpayOrderId,
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
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      orderId  // MongoDB order ID
    } = req.body;

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

    // Verify the razorpay_order_id matches
    if (order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID mismatch'
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