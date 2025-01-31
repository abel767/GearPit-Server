const Order = require('../../models/Order/orderModel')
const Product  = require('../../models/Products/productModel')


// Get today's sales analytics

const getTodayAnalytics = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: today },
                    status: { $nin: ['cancelled'] }
                }
            },
            {
                $unwind: '$items'
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    totalItems: { $sum: '$items.quantity' },
                    // Calculate revenue (assuming price includes profit margin)
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                sales: todayOrders[0]?.totalSales || 0,
                items: todayOrders[0]?.totalItems || 0,
                revenue: todayOrders[0]?.totalRevenue || 0
            }
        });
    } catch (error) {
        console.error('Error in getTodayAnalytics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get revenue data for graph with date filtering
const getRevenueData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate || new Date().setMonth(new Date().getMonth() - 6));
        const end = new Date(endDate || new Date());
        
        const revenueData = await Order.aggregate([
            {
                $match: {
                    createdAt: { 
                        $gte: start,
                        $lte: end
                    },
                    status: { $nin: ['cancelled'] }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    revenue: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({ success: true, data: revenueData });
    } catch (error) {
        console.error('Error in getRevenueData:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get most sold items by category
const getMostSoldCategories = async (req, res) => {
    try {
        const categories = await Order.aggregate([
            {
                $match: { 
                    status: { $nin: ['cancelled'] }
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $lookup: {
                    from: 'categories',  // Add this lookup to get category name
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },  // Unwind the category info
            {
                $group: {
                    _id: '$product.category',
                    categoryName: { $first: '$categoryInfo.categoryName' }, // Get category name
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { 
                        $sum: { 
                            $multiply: ['$items.price', '$items.quantity'] 
                        }
                    }
                }
            },
            {
                $project: {
                    category: '$categoryName', // Use categoryName instead of _id
                    totalSold: 1,
                    totalRevenue: 1,
                    percentage: {
                        $multiply: [
                            {
                                $divide: [
                                    '$totalSold',
                                    { $sum: '$totalSold' }
                                ]
                            },
                            100
                        ]
                    }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error in getMostSoldCategories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getMostSoldProducts = async (req, res) => {
    try {
        const products = await Order.aggregate([
            {
                $match: { 
                    status: { $nin: ['cancelled'] }
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$items.productId',
                    productName: { $first: '$product.productName' },  // Get the product name from the looked-up product
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { 
                        $sum: { 
                            $multiply: ['$items.price', '$items.quantity'] 
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    product: '$productName',  // Project the productName as 'product'
                    totalSold: 1,
                    totalRevenue: 1,
                    percentage: {
                        $multiply: [
                            {
                                $divide: [
                                    '$totalSold',
                                    { $sum: '$totalSold' }
                                ]
                            },
                            100
                        ]
                    }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Error in getMostSoldProducts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getTodayAnalytics,
    getRevenueData,
    getMostSoldCategories,
    getMostSoldProducts
};