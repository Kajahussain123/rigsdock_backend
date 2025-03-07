const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Order = require("../models/User/OrderModel");
const QRCode = require("qrcode");

// const PDFDocument = require("pdfkit");
// const fs = require("fs");
// const path = require("path");
// const Order = require("../models/User/OrderModel");

// const generateInvoice = async (orderId) => {
//   try {
//     // Fetch the order details
//     const order = await Order.findById(orderId)
//       .populate("user")
//       .populate("items.product")
//       .populate("shippingAddress");
    
//     if (!order) {
//       throw new Error("Order not found");
//     }

//     // Create a PDF document
//     const doc = new PDFDocument({
//       margin: 50,
//       size: 'A4'
//     });
    
//     // Ensure the invoices directory exists
//     const invoicesDir = "./invoices";
//     if (!fs.existsSync(invoicesDir)) {
//       fs.mkdirSync(invoicesDir, { recursive: true });
//     }
    
//     const filePath = path.join(invoicesDir, `invoice-${orderId}.pdf`);
    
//     // Create a write stream
//     const stream = fs.createWriteStream(filePath);
    
//     // Handle stream errors
//     stream.on('error', (err) => {
//       console.error("Stream error:", err);
//       throw err;
//     });
    
//     // Pipe the PDF document to the file
//     doc.pipe(stream);

//     // Add invoice header
//     doc.fontSize(25).text("INVOICE", { align: "center" });
//     doc.moveDown();
    
//     // Add invoice details
//     const invoiceTop = 150;
    
//     // Add invoice info
//     doc.fontSize(10)
//        .text(`INVOICE NUMBER: INV-${orderId.substring(0, 8).toUpperCase()}`, 50, invoiceTop)
//        .text(`DATE: ${order.createdAt.toLocaleDateString()}`, 50, invoiceTop + 15)
//        .text(`STATUS: ${order.paymentStatus.toUpperCase()}`, 50, invoiceTop + 30);

//     // We'll skip the QR code for now since it might be causing issues
    
//     // Add customer information
//     doc.fontSize(14).text('Customer Details', 50, invoiceTop + 60);
//     doc.fontSize(10)
//        .text(`Name: ${order.user.username}`, 50, invoiceTop + 80)
//        .text(`Email: ${order.user.email}`, 50, invoiceTop + 95);
    
//     // Add shipping address
//     doc.fontSize(14).text('Shipping Address', 300, invoiceTop + 60);
//     doc.fontSize(10)
//        .text(`${order.shippingAddress.addressLine1}`, 300, invoiceTop + 80)
//        .text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, 300, invoiceTop + 95)
//        .text(`${order.shippingAddress.zipCode}`, 300, invoiceTop + 110);

//     // Add table headers
//     const tableTop = invoiceTop + 150;
//     doc.fontSize(12)
//        .rect(50, tableTop, 500, 20)
//        .fill("#dddddd");
    
//     doc.fillColor("#000000")
//        .fontSize(10)
//        .text("Item", 60, tableTop + 5)
//        .text("Quantity", 250, tableTop + 5)
//        .text("Price", 350, tableTop + 5)
//        .text("Amount", 450, tableTop + 5);

//     // Add table rows
//     let y = tableTop + 30;
    
//     order.items.forEach((item, index) => {
//       const productName = item.product.name;
//       const quantity = item.quantity;
//       const price = item.price.toFixed(2);
//       const amount = (item.quantity * item.price).toFixed(2);
      
//       // Add a faint background to alternating rows
//       if (index % 2 === 0) {
//         doc.rect(50, y - 5, 500, 20).fill("#f9f9f9");
//         doc.fillColor("#000000");
//       }
      
//       doc.fontSize(10)
//          .text(productName, 60, y)
//          .text(quantity.toString(), 250, y)
//          .text(`$${price}`, 350, y)
//          .text(`$${amount}`, 450, y);
      
//       y += 20;
//     });

//     // Add table footer
//     const summaryTop = y + 20;
//     doc.rect(50, summaryTop, 500, 0.5).fillColor("#aaaaaa");
    
//     // Add total amount
//     doc.fontSize(12).font('Helvetica-Bold')
//        .text("Total:", 350, summaryTop + 30)
//        .text(`$${order.totalPrice.toFixed(2)}`, 450, summaryTop + 30);
    
//     // Add payment information
//     doc.fontSize(10).font('Helvetica')
//        .text("Payment Method: ", 50, summaryTop + 60)
//        .text(order.paymentMethod, 150, summaryTop + 60)
//        .text("Payment Status: ", 50, summaryTop + 80)
//        .text(order.paymentStatus, 150, summaryTop + 80);
    
//     // Add footer
//     doc.fontSize(8)
//        .text("Thank you for your business!", 50, 700, { align: "center" });

//     // End the document
//     doc.end();
    
//     // Return a promise that resolves when the stream is finished
//     return new Promise((resolve, reject) => {
//       stream.on('finish', () => {
//         resolve(filePath);
//       });
//       stream.on('error', reject);
//     });
    
//   } catch (error) {
//     console.error("Error generating invoice:", error);
//     throw error;
//   }
// };

const generateInvoice = async (orderId) => {
  try {
    // Fetch the order details
    const order = await Order.findById(orderId)
      .populate("user")
      .populate("items.product")
      .populate("shippingAddress");
    
    if (!order) {
      throw new Error("Order not found");
    }

    // Create a PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });
    
    // Ensure the invoices directory exists
    const invoicesDir = "./invoices";
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    
    const filePath = path.join(invoicesDir, `invoice-${orderId}.pdf`);
    
    // Create a write stream
    const stream = fs.createWriteStream(filePath);
    
    // Handle stream errors
    stream.on('error', (err) => {
      console.error("Stream error:", err);
      throw err;
    });
    
    // Pipe the PDF document to the file
    doc.pipe(stream);

    // Document title
    doc.fontSize(16).font('Helvetica-Bold').text("Tax Invoice", { align: "center" });
    doc.moveDown(0.5);
    
    // Add horizontal line
    doc.moveTo(50, 80).lineTo(550, 80).stroke();
    
    // Seller Information
    doc.fontSize(10).font('Helvetica-Bold').text("Sold By: Your Company Name", 50, 90);
    doc.fontSize(9).font('Helvetica')
      .text("Shop Address: Your Street, Your City, Your State, Pin: XXXXXX", 50, 105);
    doc.text("GSTIN: XXXXXXXXXXXX", 50, 120);
    
    // QR Code (Right aligned)
    // Generate QR Code as dataURL
    try {
      const qrCodeDataURL = await QRCode.toDataURL(`Order: ${orderId}`);
      doc.image(qrCodeDataURL, 470, 85, { width: 50, height: 50 });
    } catch (err) {
      console.error("Error generating QR code:", err);
    }
    
    // Add horizontal line
    doc.moveTo(50, 140).lineTo(550, 140).stroke();
    
    // Order and Invoice Details (Left Column)
    doc.fontSize(9).font('Helvetica-Bold').text("Order ID:", 50, 150);
    doc.font('Helvetica').text(orderId, 150, 150);
    
    doc.fontSize(9).font('Helvetica-Bold').text("Order Date:", 50, 165);
    doc.font('Helvetica').text(new Date(order.createdAt).toLocaleDateString('en-GB'), 150, 165);
    
    doc.fontSize(9).font('Helvetica-Bold').text("Invoice Date:", 50, 180);
    doc.font('Helvetica').text(new Date().toLocaleDateString('en-GB'), 150, 180);
    
    // Invoice Number (Right aligned)
    doc.fontSize(9).font('Helvetica-Bold').text("Invoice Number:", 370, 150);
    doc.font('Helvetica').text(`INV-${orderId.substring(0, 8).toUpperCase()}`, 450, 150);
    
    // Billing Address (Right Column)
    doc.fontSize(10).font('Helvetica-Bold').text("Billing Address", 370, 165);
    doc.fontSize(9).font('Helvetica').text(order.user.username, 370, 180);
    doc.text(order.shippingAddress.addressLine1, 370, 195);
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, 370, 210);
    doc.text(`${order.shippingAddress.zipCode}`, 370, 225);
    doc.text(`Phone: ${order.user.phone || "XXXXXXXXXX"}`, 370, 240);
    
    // Add horizontal line
    doc.moveTo(50, 265).lineTo(550, 265).stroke();
    
    // Table Headers
    const tableTop = 280;
    const columnPositions = {
      description: 50,
      quantity: 200,
      grossAmount: 250,
      discount: 320,
      taxableValue: 390,
      IGST: 460,
      total: 530
    };
    
    doc.fontSize(9).font('Helvetica-Bold')
  .text("Description", columnPositions.description, tableTop)
  .text("Qty", columnPositions.quantity, tableTop, { width: 20, align: 'center' })
  .text("Gross Amount", columnPositions.grossAmount, tableTop, { width: 34, align: 'right' })
  .text("Discount", columnPositions.discount, tableTop, { width: 39, align: 'right' })
  .text("Taxable value", columnPositions.taxableValue, tableTop, { width: 38, align: 'right' })
  .text("IGST", columnPositions.IGST, tableTop, { width: 22, align: 'right' })
  .text("Total", columnPositions.total, tableTop, { width: 22, align: 'right' });
    
    // Add horizontal line
    doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();
    
    // Table Rows
    let y = tableTop + 30;
    let totalQuantity = 0;
    let totalGrossAmount = 0;
    let totalDiscount = 0;
    let totalTaxableValue = 0;
    let totalTax = 0;
    let grandTotal = 0;
    
    order.items.forEach((item) => {
      // Calculate values
      const quantity = item.quantity;
      const price = item.price;
      const grossAmount = price * quantity;
      const discount = 0; // Update as needed
      const taxRate = 0.18; // Assuming 18% GST, update as needed
      const taxableValue = grossAmount - discount;
      const igst = taxableValue * taxRate;
      const totalAmount = taxableValue + igst;
      
      // For SAC/HSN code, you might need to add this to your product model
      const sacCode = item.product.sacCode || "998599";
      
      doc.fontSize(8).font('Helvetica')
    .text(`${sacCode}`, columnPositions.description, y, { width: 140 })
    .text(item.product.name, columnPositions.description, y + 12, { width: 140 })
    .text(`GST: ${taxRate * 100}%`, columnPositions.description, y + 24, { width: 140 });

  doc.fontSize(8).font('Helvetica')
    .text(quantity.toString(), columnPositions.quantity, y + 12, { align: 'center', width: 20 })
    .text(grossAmount.toFixed(2), columnPositions.grossAmount, y + 12, { align: 'right', width: 34 })
    .text(discount.toFixed(2), columnPositions.discount, y + 12, { align: 'right', width: 39 })
    .text(taxableValue.toFixed(2), columnPositions.taxableValue, y + 12, { align: 'right', width: 38 })
    .text(igst.toFixed(2), columnPositions.IGST, y + 12, { align: 'right', width: 25 })
    .text(totalAmount.toFixed(2), columnPositions.total, y + 12, { align: 'right', width: 25 });
      
      // Update totals
      totalQuantity += quantity;
      totalGrossAmount += grossAmount;
      totalDiscount += discount;
      totalTaxableValue += taxableValue;
      totalTax += igst;
      grandTotal += totalAmount;
      
      y += 40;
    });
    
    // Add horizontal line
    doc.moveTo(50, y).lineTo(550, y).stroke();
    
    // Total row
    doc.fontSize(9).font('Helvetica-Bold')
  .text("Total", columnPositions.description, y + 15)
  .text(totalQuantity.toString(), columnPositions.quantity, y + 15, { align: 'center', width: 20 })
  .text(totalGrossAmount.toFixed(2), columnPositions.grossAmount, y + 15, { align: 'right', width: 34 })
  .text(totalDiscount.toFixed(2), columnPositions.discount, y + 15, { align: 'right', width: 39 })
  .text(totalTaxableValue.toFixed(2), columnPositions.taxableValue, y + 15, { align: 'right', width: 38 })
  .text(totalTax.toFixed(2), columnPositions.IGST, y + 15, { align: 'right', width: 25 })
  .text(grandTotal.toFixed(2), columnPositions.total, y + 15, { align: 'right', width: 25 });
    
    // Add horizontal line
    doc.moveTo(50, y + 30).lineTo(550, y + 30).stroke();
    
    // Grand Total
    doc.fontSize(11).font('Helvetica-Bold')
      .text("Grand Total", 400, y + 45)
      .text(`${grandTotal.toFixed(2)}`, 520, y + 45);
    
    // // Company name
    // doc.fontSize(9).font('Helvetica')
    //   .text("Your Company Name", 520, y + 60, { align: "right" });
    
    // Add horizontal line
    doc.moveTo(50, y + 80).lineTo(550, y + 80).stroke();
    
    // // Authorized Signatory
    // doc.fontSize(9).font('Helvetica-Bold')
    //   .text("Authorized Signatory", 520, y + 100, { align: "right" });
    
    // Add footer
    const footerY = 700;
    doc.fontSize(8).font('Helvetica')
      .text("Regd. office: Your Company Name, Your Address", 50, footerY);
    doc.text("Contact Support: XXX-XXXXXXX | www.yourwebsite.com/help", 50, footerY + 15);
    
    // Page number
    doc.text("Page 1 of 1", 520, footerY + 15, { align: "right" });
    
    // End the document
    doc.end();
    
    // Return a promise that resolves when the stream is finished
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve(filePath);
      });
      stream.on('error', reject);
    });
    
  } catch (error) {
    console.error("Error generating invoice:", error);
    throw error;
  }
};

module.exports = generateInvoice;