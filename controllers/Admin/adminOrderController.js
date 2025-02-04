const Order = require('../../models/Order/orderModel');

// Get all orders for admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'userId',
        select: 'firstName lastName email profileImage'
      })
      .populate({
        path: 'items.productId',
        select: 'productName images price'
      })
      .sort({ createdAt: -1 });

    const transformedOrders = orders.map(order => {
      const orderObj = order.toObject();
      if (orderObj.userId) {
        orderObj.userId.name = `${orderObj.userId.firstName} ${orderObj.userId.lastName}`.trim();
      }
      return orderObj;
    });

    res.json({
      success: true,
      orders: transformedOrders
    });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};
// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status provided'
      });
    }

    const order = await Order.findById(orderId)
      .populate({
        path: 'userId',
        select: 'firstName lastName email profileImage'
      })
      .populate({
        path: 'items.productId',
        select: 'productName images price'
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Prevent status update if order is already cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update status of cancelled order'
      });
    }

    // Update status
    order.status = status;
    await order.save();

    // Transform the order to include full name
    const orderObj = order.toObject();
    if (orderObj.userId) {
      orderObj.userId.name = `${orderObj.userId.firstName} ${orderObj.userId.lastName}`.trim();
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: orderObj
    });
  } catch (error) {
    console.error('Failed to update order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Get order statistics for dashboard
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    // Calculate total revenue from delivered orders
    const revenueStats = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Failed to fetch order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllOrders,
  updateOrderStatus,
  getOrderStats
};