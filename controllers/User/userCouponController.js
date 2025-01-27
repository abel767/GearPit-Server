const Coupon = require('../../models/Coupon/couponModel');

const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }
 
    const searchCriteria = {
      code: code.toUpperCase(),
      status: 'Active',
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() }
    };
 
    console.log('Search criteria:', {
      ...searchCriteria,
      currentDate: new Date()
    });
 
    const coupon = await Coupon.findOne(searchCriteria);
 
    console.log('Found coupon:', coupon);
 
    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid or expired coupon' 
      });
    }
 
    if (cartTotal < coupon.minPurchase) {
      return res.status(400).json({ 
        success: false,
        message: `Minimum purchase amount of ₹${coupon.minPurchase} required`
      });
    }
 
    let discountAmount = (cartTotal * coupon.discount) / 100;
    discountAmount = Math.min(discountAmount, coupon.maxDiscount);
 
    const response = {
      success: true,
      data: {
        couponCode: coupon.code,
        discountAmount: Math.round(discountAmount),
        discountPercentage: coupon.discount,
        finalAmount: Math.round(cartTotal - discountAmount),
        minPurchase: coupon.minPurchase,
        maxDiscount: coupon.maxDiscount
      }
    };
 
    console.log('Sending response:', response);
    res.status(200).json(response);
 
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error validating coupon',
      error: error.message 
    });
  }
 };

  

const applyCoupon = async (req, res) => {
  try {
    const { code, orderId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Fix: Changed 'coupon' to 'Coupon' in the model query
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      status: 'Active',
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() }
    });

    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon not found or inactive'
      });
    }

    // Check if user has already used this coupon
    if (coupon.usedBy?.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon'
      });
    }

    // Initialize usedBy array if it doesn't exist
    if (!coupon.usedBy) {
      coupon.usedBy = [];
    }

    coupon.usedBy.push(userId);
    await coupon.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        couponCode: coupon.code,
        discount: coupon.discount,
        minPurchase: coupon.minPurchase,
        maxDiscount: coupon.maxDiscount
      }
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying coupon',
      error: error.message
    });
  }
};


const getValidCoupons = async (req, res) => {
  try {
    const currentDate = new Date();



    const coupons = await Coupon.find({
      status: 'Active',
      startDate: { $lte: currentDate },
      expiryDate: { $gte: currentDate }
    }).select('-usedBy');

    res.status(200).json({
      success: true,
      data: coupons
    });
  } catch (error) {
    console.error('Get valid coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching coupons',
      error: error.message
    });
  }
};

module.exports = {
  validateCoupon,
  applyCoupon,
  getValidCoupons
};