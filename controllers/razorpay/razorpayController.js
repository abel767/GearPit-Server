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
    try {
        const { error, orderId } = req.body;
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update order status
        order.paymentStatus = 'failed';
        order.status = 'pending';
        order.paymentRetryCount += 1;
        // Set retry window to 11 minutes from now
        order.paymentRetryWindow = new Date(Date.now() + 11 * 60000);
        
        await order.save();

        res.status(400).json({
            success: false,
            message: 'Payment failed',
            data: {
                orderId: order._id,
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
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if retry is still allowed
        if (Date.now() > order.paymentRetryWindow) {
            return res.status(400).json({
                success: false,
                message: 'Payment retry window has expired'
            });
        }

        // Create new Razorpay order
        const options = {
            amount: order.totalAmount * 100,
            currency: "INR",
            receipt: `retry_${order._id}`
        };

        const razorpayOrder = await razorpay.orders.create(options);
        
        // Update order with new Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
            success: true,
            data: {
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency
            }
        });
    } catch (error) {
        console.error('Error creating retry payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create retry payment',
            error: error.message
        });
    }
};

module.exports ={
    createPaymentOrder,
    verifyPayment,
    handlePaymentFailure,
    retryPayment
}