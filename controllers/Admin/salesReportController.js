const Order = require('../../models/Order/orderModel');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');

// Helper function to get date range
const getDateRange = (period) => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
        case 'day':
            start.setHours(0, 0, 0, 0);
            break;
        case 'week':
            start.setDate(start.getDate() - 7);
            break;
        case 'month':
            start.setMonth(start.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(start.getFullYear() - 1);
            break;
        default:
            return null;
    }
    
    return { start, end };
};

// Get sales report with filters
const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        let dateRange;

        if (startDate && endDate) {
            dateRange = {
                start: new Date(startDate),
                end: new Date(endDate)
            };
        } else if (period) {
            dateRange = getDateRange(period);
        }

        if (!dateRange) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date range or period'
            });
        }

        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: dateRange.start,
                        $lte: dateRange.end
                    },
                    status: { $nin: ['cancelled'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' },
                    totalDiscount: {
                        $sum: {
                            $add: [
                                { $ifNull: ['$couponDiscount', 0] },
                                { $ifNull: ['$offerDiscount', 0] }
                            ]
                        }
                    }
                }
            }
        ]);

        // Get daily breakdown
        const dailyBreakdown = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: dateRange.start,
                        $lte: dateRange.end
                    },
                    status: { $nin: ['cancelled'] }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    orders: { $sum: 1 },
                    amount: { $sum: '$totalAmount' },
                    discount: {
                        $sum: {
                            $add: [
                                { $ifNull: ['$couponDiscount', 0] },
                                { $ifNull: ['$offerDiscount', 0] }
                            ]
                        }
                    }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({
            success: true,
            data: {
                summary: salesData[0] || {
                    totalOrders: 0,
                    totalAmount: 0,
                    totalDiscount: 0
                },
                dailyBreakdown
            }
        });
    } catch (error) {
        console.error('Error in getSalesReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate and download Excel report
const downloadExcelReport = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        let dateRange = startDate && endDate 
            ? { start: new Date(startDate), end: new Date(endDate) }
            : getDateRange(period);

        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: dateRange.start,
                        $lte: dateRange.end
                    },
                    status: { $nin: ['cancelled'] }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    orders: { $sum: 1 },
                    amount: { $sum: '$totalAmount' },
                    discount: {
                        $sum: {
                            $add: [
                                { $ifNull: ['$couponDiscount', 0] },
                                { $ifNull: ['$offerDiscount', 0] }
                            ]
                        }
                    }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Orders', key: 'orders', width: 10 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 }
        ];

        salesData.forEach(data => {
            worksheet.addRow({
                date: data._id.date,
                orders: data.orders,
                amount: data.amount,
                discount: data.discount
            });
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=sales-report.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error in downloadExcelReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate and download PDF report
const downloadPdfReport = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        let dateRange = startDate && endDate 
            ? { start: new Date(startDate), end: new Date(endDate) }
            : getDateRange(period);

        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: dateRange.start,
                        $lte: dateRange.end
                    },
                    status: { $nin: ['cancelled'] }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    orders: { $sum: 1 },
                    amount: { $sum: '$totalAmount' },
                    discount: {
                        $sum: {
                            $add: [
                                { $ifNull: ['$couponDiscount', 0] },
                                { $ifNull: ['$offerDiscount', 0] }
                            ]
                        }
                    }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
        doc.pipe(res);

        // Add title
        doc.fontSize(16).text('Sales Report', { align: 'center' });
        doc.moveDown();

        // Create table data
        const tableData = {
            headers: ['Date', 'Orders', 'Amount', 'Discount'],
            rows: salesData.map(data => [
                data._id.date,
                data.orders.toString(),
                data.amount.toFixed(2),
                data.discount.toFixed(2)
            ])
        };

        // Draw table
        await doc.table(tableData, {
            prepareHeader: () => doc.fontSize(12),
            prepareRow: () => doc.fontSize(10)
        });

        doc.end();
    } catch (error) {
        console.error('Error in downloadPdfReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getSalesReport,
    downloadExcelReport,
    downloadPdfReport
};

