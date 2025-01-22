const PDFDocument = require('pdfkit')
const Order = require('../../models/Order/orderModel')


const generateInvoice = async(req,res)=>{
    try{
        const {orderId} = req.params

        const order = await Order.findById(orderId)
        .populate('userId', 'name email')
        .populate('items.productId', 'productName')

        if(!order){
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            })
        }

        const doc = new PDFDocument

        res.setHeader('Content-type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`)

        doc.pipe(res)

        doc.fontSize(16).text('Tax Incoice', {align: 'center'})
        doc.moveDown()

        doc.fontSize(12).text(`Order Number: ${order.orderNumber}`);
        doc.text(`Date: ${order.createdAt.toLocaleDateString()}`);
        doc.text(`Payment Method: ${order.paymentMethod.toUpperCase()}`);
        doc.moveDown();

       doc.text('Bill To:');
       doc.text(`Name: ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`);
       doc.text(`Address: ${order.shippingAddress.address}`);
       doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`);
       doc.text(`Phone: ${order.shippingAddress.phoneNumber}`);
       doc.moveDown();

       doc.text('Order Items:', { underline: true });
       doc.moveDown();

       const startX = 50;
       let currentY = doc.y;

       doc.text('Item', startX, currentY);
    doc.text('Qty', startX + 300, currentY);
    doc.text('Price', startX + 350, currentY);
    doc.text('Total', startX + 400, currentY);
    
    currentY += 20;

    order.items.forEach(item => {
        doc.text(item.productId.productName, startX, currentY);
        doc.text(item.quantity.toString(), startX + 300, currentY);
        doc.text(`₹${item.price}`, startX + 350, currentY);
        doc.text(`₹${item.price * item.quantity}`, startX + 400, currentY);
        currentY += 20;
      });
      
      doc.moveDown();
      
      // Add total
      doc.text(`Total Amount: ₹${order.totalAmount}`, { align: 'right' });
      
      // Add footer
      doc.moveDown();
      doc.fontSize(10).text('Thank you for shopping with GearPit!', { align: 'center' });
      
      // Finalize PDF
      doc.end();

    }catch(error){
        console.error('Invoice generation error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to generate invoice',
            error: error.message
        })
    }
}

module.exports = { generateInvoice };
