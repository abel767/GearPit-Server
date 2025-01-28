const Order = require('../../../models/Order/orderModel');
const Product = require('../../../models/Products/productModel');
const Category = require('../../../models/Products/categoryModel');

const getTopProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            // Only consider completed orders
            { $match: { status: 'completed' } },
            // Unwind items array
            { $unwind: '$items' },
            // Group by product
            {
                $group: {
                    _id: '$items.productId',
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { 
                        $sum: { $multiply: ['$items.price', '$items.quantity'] }
                    }
                }
            },
            // Lookup products
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            // Only include active products
            { $match: { 'product.isBlocked': false } },
            // Sort and get top 10
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            // Calculate total for percentage
            {
                $group: {
                    _id: null,
                    items: { $push: '$$ROOT' },
                    totalSales: { $sum: '$totalSold' }
                }
            }
        ]);

        if (!topProducts.length) {
            return res.json({
                success: true,
                data: []
            });
        }

        const formattedProducts = topProducts[0].items.map(item => ({
            _id: item._id,
            name: item.product.productName,
            totalSold: item.totalSold,
            totalRevenue: item.totalRevenue,
            percentage: ((item.totalSold / topProducts[0].totalSales) * 100)
        }));

        res.json({
            success: true,
            data: formattedProducts
        });

    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top products'
        });
    }
};

const getTopCategories = async (req, res) => {
    try {
        const topCategories = await Order.aggregate([
            // Only consider completed orders
            { $match: { status: 'completed' } },
            // Unwind items array
            { $unwind: '$items' },
            // Lookup products to get category info
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            // Lookup categories
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            // Only include active categories
            { $match: { 'category.isActive': true } },
            // Group by category
            {
                $group: {
                    _id: '$category._id',
                    name: { $first: '$category.categoryName' },
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: {
                        $sum: { $multiply: ['$items.price', '$items.quantity'] }
                    }
                }
            },
            // Sort and get top 10
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            // Calculate total for percentage
            {
                $group: {
                    _id: null,
                    items: { $push: '$$ROOT' },
                    totalSales: { $sum: '$totalSold' }
                }
            }
        ]);

        if (!topCategories.length) {
            return res.json({
                success: true,
                data: []
            });
        }

        const formattedCategories = topCategories[0].items.map(item => ({
            _id: item._id,
            name: item.name,
            totalSold: item.totalSold,
            totalRevenue: item.totalRevenue,
            percentage: ((item.totalSold / topCategories[0].totalSales) * 100)
        }));

        res.json({
            success: true,
            data: formattedCategories
        });

    } catch (error) {
        console.error('Error fetching top categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top categories'
        });
    }
};

module.exports = {
    getTopProducts,
    getTopCategories
};