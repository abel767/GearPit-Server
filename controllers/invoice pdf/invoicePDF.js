const PDFDocument = require('pdfkit');
const Order = require('../../models/Order/orderModel');

const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('userId', 'name email')
      .populate({
        path: 'items.productId',
        populate: {
          path: 'category',
          select: 'categoryName offer'
        }
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);

    doc.pipe(res);

    // Header section
    doc.fontSize(30)
      .text('INVOICE', 400, 50)
      .fontSize(10)
      .text(`Invoice Number: ${order.orderNumber}`, 400, 90)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 400);

    // Billing section
    doc.fontSize(12)
      .text('Bill to:', 50, 200)
      .fontSize(10)
      .text(`${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`, 50, 220)
      .text(order.shippingAddress.address)
      .text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`)
      .text(`Phone: ${order.shippingAddress.phoneNumber}`);

    // Table Headers
    doc.moveTo(50, 300)
      .lineTo(550, 300)
      .stroke();

    const tableTop = 310;
    doc.fontSize(10)
      .text('Item', 50, tableTop)
      .text('Qty', 180, tableTop)
      .text('Price', 230, tableTop)
      .text('Product Offer', 320, tableTop)
      .text('Category Offer', 390, tableTop)
      .text('Net Price', 480, tableTop);

    doc.moveTo(50, 325)
      .lineTo(550, 325)
      .stroke();

    // Calculate totals and discounts
    let subtotal = 0;
    let totalProductDiscount = 0;
    let totalCategoryDiscount = 0;
    let y = 335;

    order.items.forEach(item => {
      const product = item.productId;
      
      // Find matching variant
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
      if (!variant) return;

      const originalPrice = variant.price;
      const totalOriginalPrice = originalPrice * item.quantity;
      
      // Calculate product offer discount
      let productDiscountAmount = 0;
      let priceAfterProductDiscount = totalOriginalPrice;
      
      if (product.offer && product.offer.isActive) {
        productDiscountAmount = (totalOriginalPrice * product.offer.percentage) / 100;
        priceAfterProductDiscount = totalOriginalPrice - productDiscountAmount;
      }

      // Calculate category offer discount
      let categoryDiscountAmount = 0;
      if (product.category && product.category.offer && product.category.offer.isActive) {
        categoryDiscountAmount = (priceAfterProductDiscount * product.category.offer.percentage) / 100;
      }

      const finalPrice = priceAfterProductDiscount - categoryDiscountAmount;
      
      // Add to totals
      subtotal += totalOriginalPrice;
      totalProductDiscount += productDiscountAmount;
      totalCategoryDiscount += categoryDiscountAmount;

      // Display item details
      doc.text(product.productName + ` (${variant.size})`, 50, y)
         .text(item.quantity.toString(), 180, y)
         .text(`₹${originalPrice.toFixed(2)}`, 230, y)
         .text(product.offer?.isActive ? `${product.offer.percentage}%` : '-', 320, y)
         .text(product.category?.offer?.isActive ? `${product.category.offer.percentage}%` : '-', 390, y)
         .text(`₹${(finalPrice).toFixed(2)}`, 480, y);
      
      y += 20;
    });

    // Terms & Conditions
    doc.fontSize(10)
      .text('Terms & Conditions:', 50, y + 20)
      .fontSize(8)
      .text('1. All items sold are non-returnable', 50, y + 35)
      .text('2. Warranty claims subject to manufacturer policy', 50, y + 45)
      .text('3. Price inclusive of all taxes where applicable', 50, y + 55);

    // Total Calculation
    const totalY = y + 100;
    const totalDiscount = totalProductDiscount + totalCategoryDiscount;
    const finalTotal = subtotal - totalDiscount;
    
    doc.fontSize(10)
      .text('Subtotal:', 380, totalY)
      .text(`₹${subtotal.toFixed(2)}`, 480, totalY)
      .text('Product Offers:', 380, totalY + 20)
      .text(`-₹${totalProductDiscount.toFixed(2)}`, 480, totalY + 20)
      .text('Category Offers:', 380, totalY + 40)
      .text(`-₹${totalCategoryDiscount.toFixed(2)}`, 480, totalY + 40)
      .text('Total Discount:', 380, totalY + 60)
      .text(`-₹${totalDiscount.toFixed(2)}`, 480, totalY + 60);

    // Final Total
    doc.fontSize(12)
      .text('Final Total', 380, totalY + 90, { bold: true })
      .text(`₹${finalTotal.toFixed(2)}`, 480, totalY + 90, { bold: true });

    // Footer
    doc.fontSize(10)
      .text('Thank you for shopping with GeraPit!', 50, 700, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
};

module.exports = { generateInvoice };