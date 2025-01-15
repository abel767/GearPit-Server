const Coupon = require('../../models/Coupon/couponModel')

const createCoupon = async (req, res) => {
    try {
      const { code, discount, maxDiscount, minPurchase, startDate, expiryDate } = req.body;
  
      // Validate required fields
      if (!code || !discount || !maxDiscount || !minPurchase || !startDate || !expiryDate) {
        return res.status(400).json({
          status: 'error',
          message: 'All fields are required'
        });
      }
  
      // Validate date range
      const start = new Date(startDate);
      const expiry = new Date(expiryDate);
      
      if (start >= expiry) {
        return res.status(400).json({
          status: 'error',
          message: 'Start date must be before expiry date'
        });
      }
  
      // Check if coupon code already exists
      const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
      if (existingCoupon) {
        return res.status(400).json({
          status: 'error',
          message: 'Coupon code already exists'
        });
      }
  
      // Create new coupon
      const coupon = new Coupon({
        code: code.toUpperCase(),
        discount: Number(discount),
        maxDiscount: Number(maxDiscount),
        minPurchase: Number(minPurchase),
        startDate: start,
        expiryDate: expiry,
        status: 'Active'
      });
  
      await coupon.save();
  
      res.status(201).json({
        status: 'success',
        message: 'Coupon created successfully',
        coupon
      });
  
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create coupon',
        error: error.message
      });
    }
  };
  
  // Get all coupons
  const getAllCoupons = async (req, res) => {
    try {
      const coupons = await Coupon.find().sort({ createdAt: -1 });
      res.json({
        status: 'success',
        coupons
      });
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch coupons',
        error: error.message
      });
    }
  };
  
  // Toggle coupon status
  const toggleCouponStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findById(id);
  
      if (!coupon) {
        return res.status(404).json({
          status: 'error',
          message: 'Coupon not found'
        });
      }
  
      coupon.status = coupon.status === 'Active' ? 'Inactive' : 'Active';
      await coupon.save();
  
      res.json({
        status: 'success',
        message: 'Coupon status updated successfully',
        coupon
      });
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update coupon status',
        error: error.message
      });
    }
  };
  
  // Delete coupon
  const deleteCoupon = async (req, res) => {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findByIdAndDelete(id);
  
      if (!coupon) {
        return res.status(404).json({
          status: 'error',
          message: 'Coupon not found'
        });
      }
  
      res.json({
        status: 'success',
        message: 'Coupon deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete coupon',
        error: error.message
      });
    }
  };
  
  module.exports = {
    createCoupon,
    getAllCoupons,
    toggleCouponStatus,
    deleteCoupon
  };