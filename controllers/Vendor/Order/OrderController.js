const Order = require('../../../models/User/OrderModel');
const Product = require('../../../models/admin/ProductModel');
const PlatformFee = require('../../../models/admin/PlatformFeeModel');
const axios = require("axios");

const {
  createInvoice,
  createCustomer,
  createProductInZoho,
  searchCustomerInZoho,
} = require("../../../utils/zohoBooksService");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Vendor = require("../../../models/Vendor/vendorModel");

// get all order by vendor id
exports.getAllOrders = async (req, res) => {
  try {
    // Find all products owned by the logged-in vendor
    const vendorProducts = await Product.find({ owner: req.user.id }).select("_id");
    const productIds = vendorProducts.map(product => product._id);

    // Find all orders that contain these products with proper error handling
    const orders = await Order.find({ "items.product": { $in: productIds } })
    .sort({ createdAt: -1 })
      .populate("user", "name email")
      .populate({
        path: 'items.product',
        populate: {
          path: 'owner',
          model: 'Vendor'
        }
      })
      .populate("shippingAddress");

    const platformFeeData = await PlatformFee.findOne().sort({ createdAt: -1 });
    const platformFee = platformFeeData?.amount || 0;

    const processedOrders = orders
      .map(order => {
        // Filter items to include only vendor's products with null checks
        const filteredItems = order.items.filter(item => 
          item.product && 
          item.product._id && 
          productIds.some(id => id.equals(item.product._id))
        );

        // Calculate order totals
        const itemsTotal = filteredItems.reduce(
          (total, item) => total + (item.price * item.quantity), 0
        );
        const finalTotal = itemsTotal + platformFee;

        return {
          ...order.toObject(),
          items: filteredItems,
          itemsTotal,
          platformFee,
          finalTotalPrice: finalTotal
        };
      })
      // Remove orders with no items after filtering
      .filter(order => order.items.length > 0);

    res.status(200).json({
      message: "Orders fetched successfully",
      total: processedOrders.length,
      platformFee,
      orders: processedOrders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: "An error occurred while fetching orders",
      error: error.message 
    });
  }
}

// Get vendor order by ID
exports.getOrderById = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId)
      .populate("user", "name email")
      .populate({
        path: "items.product",
        populate: [
          { path: "owner", model: "Vendor" },
          { path: "category", model: "Category" }
        ]
      })
      .populate("shippingAddress");

    if (!order) {
      return res.status(404).send({ error: "Order not found." });
    }

    const vendorProducts = await Product.find({ owner: req.user.id }).select("_id");

    const productIds = vendorProducts.map(product => product._id.toString());

    order.items = order.items.filter(item => {
      const itemProductId = item.product._id.toString();
      return productIds.includes(itemProductId);
    });

    order.totalPrice = order.items.reduce((total, item) => total + item.price * item.quantity, 0);

    if (order.items.length === 0) {
      return res.status(200).send({ message: "No items in this order belong to the logged-in vendor." });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send({ error: "An error occurred while fetching the order." });
  }
};


exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const { orderId } = req.params;
    if (!orderStatus) {
      return res.status(400).json({ message: "orderStatus is required" });
    }
    const updatedOrder = await Order.findByIdAndUpdate(orderId, { orderStatus }, { new: true });
    if (!updatedOrder) {
      return res.status(404).json({ message: "order status not updated" });
    }
    res.status(200).json({ message: "order status updated", updatedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message })
  }
}

exports.generateVendorInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate({
        path: "items.product",
        populate: [
          { path: "owner" },
          { path: "category" }
        ]
      })
      .populate("shippingAddress")
      .populate("user");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Extract vendor ID from the order if it exists
    const vendorId = order.vendor || order.items[0]?.product?.owner?._id?.toString();

    if (!vendorId) {
      return res.status(400).json({ error: "Could not identify vendor for this order" });
    }

    console.log("Vendor ID:", vendorId);
    console.log("Order ID:", orderId);

    // Debug info for each item
    order.items.forEach((item, index) => {
      console.log(`Item ${index} product owner ID:`, item.product?.owner?._id?.toString());
      console.log(`Item ${index} matches vendor:`, item.product?.owner?._id?.toString() === vendorId);
    });

    // Filter items for the current vendor only
    const vendorItems = order.items.filter(item => {
      const itemOwnerId = item.product?.owner?._id;
      return itemOwnerId && itemOwnerId.equals(vendorId);
    });

    if (vendorItems.length === 0) {
      return res.status(404).json({ error: "No products from this vendor in the order" });
    }

    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // ================ ZOHO BOOKS INTEGRATION START ================

    // Tax type determination function (same as in user invoice)
    const determineTaxType = (buyerState, sellerState) => {
      // Convert states to lowercase for comparison
      buyerState = (buyerState || "").toLowerCase().trim();
      sellerState = (sellerState || "").toLowerCase().trim();

      // If both in same state, use CGST+SGST (intra-state)
      if (!buyerState || !sellerState || buyerState === sellerState) {
        return "intra-state";
      } else {
        return "inter-state";
      }
    };

    // Get Zoho tax ID based on tax type
    const getTaxId = (taxType) => {
      if (taxType === "intra-state") {
        return "2520220000000033193"; // GST18 (new intra-state)
      } else {
        return "2520220000000033091"; // IGST18 (new inter-state)
      }
    };

    // Check if customer exists in Zoho or create new one
    let customerId = order.user.zohoCustomerId;
    if (!customerId) {
      const existingCustomer = await searchCustomerInZoho(order.user.email);
      if (existingCustomer) {
        customerId = existingCustomer.contact_id;
        order.user.zohoCustomerId = customerId;
        await order.user.save();
      } else {
        // Create customer in Zoho
        const shippingAddress = order.shippingAddress;
        const customerData = {
          contact_name: `${shippingAddress?.firstName?.trim() || "Customer"
            } (${Date.now()})`,
          company_name: order.user.company || shippingAddress.firstName,
          email: order.user.email,
          phone: shippingAddress.phone,
          contact_type: "customer",
          customer_sub_type: "business",
          billing_address: {
            attention: `${shippingAddress?.firstName?.trim() || ""} ${shippingAddress?.lastName?.trim() || ""
              }`.trim(),
            address: shippingAddress.addressLine1 || "Default Address",
            address_line2: shippingAddress.addressLine2 || "",
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zipCode,
            country: shippingAddress.country,
            phone: shippingAddress.phone || order.user.mobileNumber || "+0000000000",
          },
        };

        try {
          const newCustomer = await createCustomer(customerData);
          customerId = newCustomer.contact_id;
          order.user.zohoCustomerId = customerId;
          await order.user.save();
        } catch (customerError) {
          // Retry with a unique name if there's a collision
          customerData.contact_name = `${shippingAddress.firstName?.trim() || "Customer"
            } (${Date.now()}-${Math.floor(Math.random() * 1000)})`;

          const retryCustomer = await createCustomer(customerData);
          customerId = retryCustomer.contact_id;
          order.user.zohoCustomerId = customerId;
          await order.user.save();
        }
      }
    }

    // Process products for Zoho
    for (const item of vendorItems) {
      if (!item.product.zohoItemId) {
        const productData = {
          name: `${item.product.name} (${Date.now()})`,
          rate: item.price || item.product.finalPrice || item.product.price,
          description: item.product.description || "",
          sku: item.product.sku || `SKU-${item.product._id}`,
        };

        try {
          const newProduct = await createProductInZoho(productData);
          item.product.zohoItemId = newProduct.item_id;
          await item.product.save();
        } catch (productError) {
          // Retry with a unique name
          productData.name = `${item.product.name
            } (${Date.now()}-${Math.floor(Math.random() * 1000)})`;
          const retryProduct = await createProductInZoho(productData);
          item.product.zohoItemId = retryProduct.item_id;
          await item.product.save();
        }
      }
    }

    // Tax debugging info (optional, can be removed in production)
    const debugTaxInfo = () => {
      console.log("===== VENDOR TAX DEBUGGING INFO =====");

      for (const item of vendorItems) {
        const buyerState = order.shippingAddress.state || "";
        const sellerState = vendor.state || "";

        const taxType = determineTaxType(buyerState, sellerState);

        console.log(`Order ID: ${orderId}`);
        console.log(`Product: ${item.product.name}`);
        console.log(`Buyer State: "${buyerState}"`);
        console.log(`Seller State: "${sellerState}"`);
        console.log(`Tax Type: ${taxType}`);
        console.log("----------------------------");
      }

      console.log("=============================");
    };

    // Call tax debug function
    debugTaxInfo();

    // Prepare line items for Zoho invoice
    const taxType = determineTaxType(
      order.shippingAddress.state,
      vendor.state
    );

    const lineItems = vendorItems.map(item => ({
      item_id: item.product.zohoItemId,
      name: item.product.name,
      description: item.product.description,
      quantity: item.quantity,
      rate: item.price,
      tax_id: getTaxId(taxType),
      sku: item.product.sku || `SKU-${item.product._id}`
    }));

    // Create Zoho invoice
    const invoiceData = {
      customer_id: customerId,
      currency_id: order.currencyId || 982000000000190, // Default currency ID for INR
      line_items: lineItems,
      reference_number: `VENDOR-${orderId}-${vendorId}`,
      notes: `Vendor invoice for order ${orderId}`,
    };

    const invoiceResponse = await createInvoice(invoiceData);
    // ================ ZOHO BOOKS INTEGRATION END ================

    // Calculate vendor subtotal
    const vendorSubtotal = vendorItems.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );

    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 30,
        bottom: 30,
        left: 50,
        right: 50,
      },
      autoFirstPage: true,
    });

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    // Generate vendor invoice filename and path
    const invoiceFileName = `vendor-invoice-${orderId}-${vendorId}-${Date.now()}.pdf`;
    const invoicePath = path.join(uploadDir, invoiceFileName);
    const invoiceUrl = `${req.protocol}://${req.get("host")}/uploads/${invoiceFileName}`;

    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);

    // Define colors
    const colors = {
      text: "#000000",
      gray: "#666666",
      border: "#E0E0E0",
      highlight: "#4a90e2",
      warningBox: "#f8f9fa",
    };

    // Add logo URL
    const logoUrl = "https://i.postimg.cc/K8ftVqFJ/Rigs-Docklogo.png";
    const signatureUrl = "https://i.postimg.cc/Y2GzrHML/Untitled-design.png";

    // Function to add footer to each page
    const addFooter = () => {
      const footerY = doc.page.height - 50;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.gray)
        .text(
          "Contact: +91 97784 66748 | Email: support@rigsdock.com",
          50,
          footerY,
          { width: doc.page.width - 100, align: "center" }
        );
    };

    // Set up page event to add footer to each page
    doc.on("pageAdded", addFooter);

    // Move to top of first page
    doc.moveDown(0);

    // Add logo to the first page
    try {
      const logoResponse = await axios.get(logoUrl, {
        responseType: "arraybuffer",
      });
      const logoBuffer = Buffer.from(logoResponse.data, "binary");
      doc.image(logoBuffer, 5, 20, { width: 200, height: 130 });
    } catch (logoError) {
      console.error("Error loading logo:", logoError);
    }

    // Vendor invoice header
    doc
      .fontSize(16)
      .fillColor(colors.text)
      .text("VENDOR INVOICE", 300, 60, { align: "right" })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor(colors.gray)
      .text("Original for Vendor", 300, 80, { align: "right" })
      .moveDown(1);

    // Vendor & Invoice Details
    doc.fillColor(colors.text).fontSize(9);

    // Create two-column layout for company and invoice details
    doc
      .text("Vendor Details", 50, 120)
      .text("Invoice Details", 350, 120)
      .moveDown(0.5);

    // Vendor information
    doc
      .font("Helvetica-Bold")
      .text(`${vendor.businessname || "Vendor"} Pvt. Ltd.`, 50, 140)
      .font("Helvetica")
      .text(`${vendor.address || "Corporate Address"}`, 50, 155)
      .text(`GSTIN: ${vendor.gst || "Pending"}`, 50, 170)
      .text(`State: ${vendor.state || "Pending"}`, 50, 185);

    // Invoice details
    const invoiceNumber = invoiceResponse.invoice ?
      invoiceResponse.invoice.invoice_number :
      `VND-${orderId.slice(-6)}-${Date.now().toString().slice(-6)}`;

    doc
      .text(`Invoice No: ${invoiceNumber}`, 350, 140)
      .text(`Date: ${new Date().toLocaleDateString()}`, 350, 155)
      .text(`Order ID: ${orderId}`, 350, 170)
      .text(`Customer: ${order.user.name}`, 350, 185);

    // Customer Address
    const shippingAddress = order.shippingAddress || {};
    const shippingAddressData = shippingAddress._doc || shippingAddress;
    const firstName = shippingAddressData.firstName || "Customer";
    const lastName = shippingAddressData.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Shipping Address:", 50, 210, { underline: true })
      .font("Helvetica")
      .text(fullName, 50, 225)
      .text(`${shippingAddress.addressLine1 || ""}`, 50, 240)
      .text(`${shippingAddress.addressLine2 || ""}`, 50, 255)
      .text(
        `${shippingAddress.city || ""}, ${shippingAddress.state || ""}`,
        50,
        270
      )
      .text(
        `${shippingAddress.country || ""} - ${shippingAddress.zipCode || ""}`,
        50,
        285
      )
      .text(`Phone: ${shippingAddress.phone || "N/A"}`, 50, 300);

    // Warranty Message Box
    doc
      .rect(350, 210, 220, 60)
      .fillAndStroke(colors.warningBox, colors.border);
    doc
      .fontSize(9)
      .fillColor(colors.text)
      .font("Helvetica-Bold")
      .text("*Keep this invoice and", 370, 225)
      .text("manufacturer box for", 370, 240)
      .text("warranty purposes.", 370, 255);

    // Line Items Table
    const tableTop = 320;
    const columnWidths = [35, 200, 70, 55, 110];
    const rowHeight = 25;
    const headers = [
      "S.No",
      "Product Description",
      "HSN",
      "Quantity",
      "Total Amount",
    ];

    // Draw Table Header
    doc.lineWidth(0.5).strokeColor(colors.border);
    doc
      .rect(50, tableTop - 5, 530, 25)
      .fillAndStroke(colors.highlight, colors.border);

    headers.forEach((header, i) => {
      doc
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text(
          header,
          50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
          tableTop,
          {
            width: columnWidths[i],
            align:
              i === 0 || i === 3
                ? "center"
                : i === 1
                  ? "left"
                  : i === 4
                    ? "right"
                    : "center",
          }
        );
    });

    // Line Items
    let yPos = tableTop + 25;
    doc.font("Helvetica").fillColor(colors.text);

    let isEvenRow = false;

    vendorItems.forEach((item, index) => {
      // Add row background
      if (isEvenRow) {
        doc
          .rect(50, yPos - 5, 530, rowHeight)
          .fillColor("#F9F9F9")
          .fill();
      }
      doc.fillColor(colors.text);

      const rowData = [
        index + 1,
        item.product.name,
        item.product.sku || "N/A",
        item.quantity,
        `Rs ${(item.price * item.quantity).toFixed(2)}`,
      ];

      rowData.forEach((data, i) => {
        doc.text(
          data.toString(),
          50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
          yPos,
          {
            width: columnWidths[i],
            align:
              i === 0 || i === 3
                ? "center"
                : i === 1
                  ? "left"
                  : i === 4
                    ? "right"
                    : "center",
          }
        );
      });

      // Draw horizontal line between rows
      doc
        .moveTo(50, yPos + rowHeight - 2)
        .lineTo(550, yPos + rowHeight - 2)
        .strokeColor(colors.border)
        .stroke();

      yPos += rowHeight;
      isEvenRow = !isEvenRow;
    });

    const gstRate = 0.18; // 18% GST rate
    const gstAmount = vendorSubtotal * gstRate;
    const total = vendorSubtotal + gstAmount;

    // Calculate commission
    const commissionRate = 0.05; // 5% commission rate (can be configured)
    const commission = vendorSubtotal * commissionRate;
    const commissionWithGST = commission * 1.18; // Commission + 18% GST
    const finalSettlementAmount = total - commissionWithGST;

    const priceWidth = 90;
    const labelX = 360;
    const priceX = 450;

    // Add box around totals section
    doc
      .rect(350, yPos + 5, 200, 120) // Increased height for commission details
      .fillAndStroke("#F9F9F9", colors.border);

    // Left-align labels and right-align amounts
    doc.font("Helvetica").fontSize(9).fillColor(colors.text);

    // Subtotal row
    doc.text("Subtotal", labelX, yPos + 10);
    doc.text(`Rs ${vendorSubtotal.toFixed(2)}`, priceX, yPos + 10, {
      align: "right",
      width: priceWidth,
    });

    // Tax rows based on tax type
    if (taxType === "intra-state") {
      const cgst = gstAmount / 2;
      const sgst = gstAmount / 2;

      doc.text("CGST (9%)", labelX, yPos + 25);
      doc.text(`Rs ${cgst.toFixed(2)}`, priceX, yPos + 25, {
        align: "right",
        width: priceWidth,
      });

      doc.text("SGST (9%)", labelX, yPos + 40);
      doc.text(`Rs ${sgst.toFixed(2)}`, priceX, yPos + 40, {
        align: "right",
        width: priceWidth,
      });
    } else {
      doc.text("IGST (18%)", labelX, yPos + 32);
      doc.text(`Rs ${gstAmount.toFixed(2)}`, priceX, yPos + 32, {
        align: "right",
        width: priceWidth,
      });
    }

    // Total Order Value
    doc.font("Helvetica-Bold");
    doc.text("Total Order Value", labelX, yPos + 55);
    doc.text(`Rs ${total.toFixed(2)}`, priceX, yPos + 55, {
      align: "right",
      width: priceWidth,
    });

    // Commission section
    doc.font("Helvetica");
    doc.text("Commission (5%)", labelX, yPos + 70);
    doc.text(`Rs ${commission.toFixed(2)}`, priceX, yPos + 70, {
      align: "right",
      width: priceWidth,
    });

    doc.text("GST on Commission (18%)", labelX, yPos + 85);
    doc.text(`Rs ${(commission * 0.18).toFixed(2)}`, priceX, yPos + 85, {
      align: "right",
      width: priceWidth,
    });

    // Settlement Amount (Final)
    doc.font("Helvetica-Bold");
    doc.text("Settlement Amount", labelX, yPos + 100);
    doc.text(`Rs ${finalSettlementAmount.toFixed(2)}`, priceX, yPos + 100, {
      align: "right",
      width: priceWidth,
    });

    // Add Commission explanation box
    yPos += 140;
    doc
      .rect(50, yPos, 530, 80)
      .fillAndStroke(colors.warningBox, colors.border);

    doc
      .font("Helvetica-Bold")
      .fillColor(colors.text)
      .text("COMMISSION BREAKDOWN", 50 + 10, yPos + 10);

    doc
      .font("Helvetica")
      .text("• Commission is calculated at 5% of the total order value before taxes.", 50 + 10, yPos + 25);
    doc
      .text("• 18% GST is applicable on the commission amount.", 50 + 10, yPos + 40);
    doc
      .text("• Settlement amount is the final payment that will be transferred to your bank account.", 50 + 10, yPos + 55);
    doc
      .text("• Settlement will be processed within 7 working days after order delivery confirmation.", 50 + 10, yPos + 70);

    // Add signature section
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const footerHeight = 50;
    const signatureHeight = 80;
    const signatureY = pageHeight - footerHeight - signatureHeight;

    doc.y = signatureY;

    // Add authentication section
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("For RigsDock Pvt. Ltd.", pageWidth - 180, signatureY, {
        width: 140,
        align: "left",
      });

    doc.moveDown(1);

    try {
      const signatureResponse = await axios.get(signatureUrl, {
        responseType: "arraybuffer",
      });
      const signatureBuffer = Buffer.from(signatureResponse.data, "binary");

      doc.image(signatureBuffer, pageWidth - 170, signatureY + 15, {
        width: 80,
        height: 40,
      });
    } catch (signatureError) {
      console.error("Error loading signature:", signatureError);
    }

    doc
      .font("Helvetica")
      .text("Authorized Signatory", pageWidth - 160, signatureY + 60, {
        width: 120,
        align: "left",
      });

    // Add footer
    addFooter();

    // End the PDF document
    doc.end();

    // Wait for the PDF to be written to disk
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Prepare response data
    const taxBreakdown = taxType === "intra-state"
      ? { cgst: gstAmount / 2, sgst: gstAmount / 2, igst: 0 }
      : { cgst: 0, sgst: 0, igst: gstAmount };

    const commissionBreakdown = {
      commissionBase: commission,
      commissionGST: commission * 0.18,
      totalCommission: commissionWithGST
    };

    res.status(200).json({
      message: "Vendor invoice generated successfully",
      invoiceUrl,
      zohoInvoice: invoiceResponse,
      orderDetails: {
        orderId,
        vendorName: vendor.businessname,
        subtotal: vendorSubtotal,
        taxType,
        taxBreakdown,
        totalAmount: total,
        commissionBreakdown,
        settlementAmount: finalSettlementAmount,
        customer: {
          name: order.user.name,
          email: order.user.email,
          shippingAddress: order.shippingAddress
        },
        items: vendorItems.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        }))
      }
    });
  } catch (error) {
    console.error("❌ Vendor Invoice Generation Error:", error);
    res.status(500).json({
      error: "Vendor invoice generation failed",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};