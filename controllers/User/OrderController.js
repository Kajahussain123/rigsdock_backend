const Order = require("../../models/User/OrderModel");
const Cart = require("../../models/User/CartModel");
const Address = require("../../models/User/AddressModel");
const MainOrder = require("../../models/User/MainOrderModel");
const axios = require("axios");
const mongoose = require("mongoose");
const crypto = require('crypto');
const PlatformFee = require("../../models/admin/PlatformFeeModel");
const Vendor = require("../../models/Vendor/vendorModel");
const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require('pg-sdk-node');
const { randomUUID } = require('crypto');
const { createShiprocketOrder } = require('../../controllers/Shiprocket/ShipRocketController');
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode");


const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = 1;
const PHONEPE_ENV = process.env.NODE_ENV === 'production' ? Env.PRODUCTION : Env.SANDBOX;
const PHONEPE_CALLBACK_USERNAME = process.env.PHONEPE_CALLBACK_USERNAME;
const PHONEPE_CALLBACK_PASSWORD = process.env.PHONEPE_CALLBACK_PASSWORD;

const phonePeClient = StandardCheckoutClient.getInstance(
    PHONEPE_CLIENT_ID,
    PHONEPE_CLIENT_SECRET,
    PHONEPE_CLIENT_VERSION,
    PHONEPE_ENV
);

// exports.placeOrder = async (req, res) => {
//   try {
//       const { userId, shippingAddressId, paymentMethod } = req.body;

//       // Fetch user's cart
//       const cart = await Cart.findOne({ user: userId }).populate("items.product");

//       if (!cart || cart.items.length === 0) {
//           return res.status(400).json({ message: "Cart is empty" });
//       }

//       // Validate shipping address
//       const shippingAddress = await Address.findById(shippingAddressId);
//       if (!shippingAddress) {
//           return res.status(400).json({ message: "Invalid shipping address" });
//       }

//       // Validate payment method
//       const validPaymentMethods = ["COD", "PhonePe", "Credit Card", "Debit Card", "UPI"];
//       if (!validPaymentMethods.includes(paymentMethod)) {
//           return res.status(400).json({ message: "Invalid payment method" });
//       }

//       // Group items by vendor
//       const vendorOrders = {};
//       let totalAmount = 0;

//       cart.items.forEach(item => {
//           const vendorId = item.product.owner ? item.product.owner.toString() : null;
//           if (!vendorId) {
//               console.error("Error: Product missing owner field", item.product);
//               return;
//           }

//           if (!vendorOrders[vendorId]) {
//               vendorOrders[vendorId] = { vendor: vendorId, items: [], totalPrice: 0 };
//           }

//           vendorOrders[vendorId].items.push({
//               product: item.product._id,
//               quantity: item.quantity,
//               price: item.price,
//           });

//           vendorOrders[vendorId].totalPrice += item.price * item.quantity;
//           totalAmount += item.price * item.quantity;
//       });

//       // Create Main Order
//       const mainOrder = new MainOrder({
//           user: userId,
//           totalAmount,
//           paymentMethod,
//           paymentStatus: paymentMethod === "COD" ? "Pending" : "Processing",
//           orderStatus: "Processing",
//           shippingAddress: shippingAddressId,
//           subOrders: [],
//       });

//       await mainOrder.save();

//       // Create vendor orders
//       const createdOrders = [];
//       for (const vendorId in vendorOrders) {
//           const orderData = vendorOrders[vendorId];

//           const newOrder = new Order({
//               mainOrderId: mainOrder._id,
//               user: userId,
//               vendor: vendorId,
//               items: orderData.items,
//               totalPrice: orderData.totalPrice,
//               paymentMethod,
//               paymentStatus: paymentMethod === "COD" ? "Pending" : "Processing",
//               orderStatus: "Processing",
//               shippingAddress: shippingAddressId,
//           });

//           await newOrder.save();
//           createdOrders.push(newOrder._id);
//       }

//       // Update Main Order with subOrders
//       mainOrder.subOrders = createdOrders;
//       await mainOrder.save();

//       // Create Shiprocket shipments for each sub-order
//       const shiprocketResponses = [];
//       for (const subOrderId of createdOrders) {
//           const subOrder = await Order.findById(subOrderId).populate('items.product');

//           // Create Shiprocket order for each subOrder
//           const response = await createShiprocketOrder(subOrder, mainOrder, shippingAddress, userId);

//           // Save Shiprocket IDs to the subOrder
//           subOrder.shiprocketOrderId = response.order_id;
//           subOrder.shiprocketShipmentId = response.shipment_id;
//           await subOrder.save();

//           shiprocketResponses.push(response);
//       }

//       // Prepare response data based on payment method
//       let responseData;

//       if (paymentMethod === "COD") {
//           await Cart.findOneAndUpdate({ user: userId }, { items: [], totalPrice: 0, coupon: null });
//           responseData = {
//               message: "Order placed successfully with Cash on Delivery",
//               mainOrderId: mainOrder._id,
//               orders: createdOrders,
//               shiprocketResponses,
//           };
//       } 
//       else if (paymentMethod === "PhonePe") {
//           const merchantTransactionId = randomUUID();
//           const amountInPaisa = totalAmount * 100;
//           const redirectUrl = `${process.env.FRONTEND_URL}/payment-status?order_id=${mainOrder._id}`;

//           const metaInfo = {
//               udf1: "order",
//               udf2: userId
//           };

//           const payRequest = StandardCheckoutPayRequest.builder()
//               .merchantOrderId(merchantTransactionId)
//               .amount(amountInPaisa)
//               .redirectUrl(redirectUrl)
//               .metaInfo(metaInfo)
//               .build();

//           const phonepeResponse = await phonePeClient.pay(payRequest);
          
//           mainOrder.phonepeTransactionId = merchantTransactionId;
//           await mainOrder.save();

//           responseData = {
//               message: "Proceed to PhonePe Payment",
//               paymentUrl: phonepeResponse.redirectUrl,
//               mainOrderId: mainOrder._id,
//               orders: createdOrders,
//               phonepeTransactionId: merchantTransactionId,
//               shiprocketResponses,
//           };
//       } 
//       else {
//           responseData = {
//               message: "Payment method not implemented yet",
//               mainOrderId: mainOrder._id,
//               orders: createdOrders,
//               shiprocketResponses,
//           };
//       }

//       // Send a single response at the end
//       res.status(201).json(responseData);

//   } catch (error) {
//       console.error("Error placing order:", error);
//       if (!res.headersSent) {
//           res.status(500).json({ 
//               message: "Error placing order", 
//               error: error.message,
//               stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//           });
//       }
//   }
// };
exports.placeOrder = async (req, res) => {
  try {
      const { userId, shippingAddressId, paymentMethod } = req.body;

      // Fetch user's cart
      const cart = await Cart.findOne({ user: userId }).populate("items.product");

      if (!cart || cart.items.length === 0) {
          return res.status(400).json({ message: "Cart is empty" });
      }

      // Validate shipping address
      const shippingAddress = await Address.findById(shippingAddressId);
      if (!shippingAddress) {
          return res.status(400).json({ message: "Invalid shipping address" });
      }

      // Validate payment method
      const validPaymentMethods = ["COD", "PhonePe", "Credit Card", "Debit Card", "UPI"];
      if (!validPaymentMethods.includes(paymentMethod)) {
          return res.status(400).json({ message: "Invalid payment method" });
      }

      // Fetch platform fee
      const platformFee = await PlatformFee.findOne().sort({ createdAt: -1 });
      if (!platformFee) {
          console.error("Platform fee not configured");
          return res.status(500).json({ message: "Platform fee configuration not found" });
      }

      // Group items by vendor
      const vendorOrders = {};
      let subtotal = 0;

      cart.items.forEach(item => {
          const vendorId = item.product.owner ? item.product.owner.toString() : null;
          if (!vendorId) {
              console.error("Error: Product missing owner field", item.product);
              return;
          }

          if (!vendorOrders[vendorId]) {
              vendorOrders[vendorId] = { vendor: vendorId, items: [], totalPrice: 0 };
          }

          vendorOrders[vendorId].items.push({
              product: item.product._id,
              quantity: item.quantity,
              price: item.price,
          });

          vendorOrders[vendorId].totalPrice += item.price * item.quantity;
          subtotal += item.price * item.quantity;
      });

      // Calculate platform fee
      let platformFeeAmount = 0;
      if (platformFee.feeType === "fixed") {
          platformFeeAmount = platformFee.amount;
      } else if (platformFee.feeType === "percentage") {
          platformFeeAmount = (subtotal * platformFee.amount) / 100;
      }

      // Calculate total amount including platform fee
      const totalAmount = subtotal + platformFeeAmount;

      // Create Main Order
      const mainOrder = new MainOrder({
          user: userId,
          subtotal,
          platformFee: platformFeeAmount,
          totalAmount,
          paymentMethod,
          paymentStatus: paymentMethod === "COD" ? "Pending" : "Processing",
          orderStatus: "Processing",
          shippingAddress: shippingAddressId,
          subOrders: [],
      });

      await mainOrder.save();

      // Create vendor orders
      const createdOrders = [];
      for (const vendorId in vendorOrders) {
          const orderData = vendorOrders[vendorId];

          const newOrder = new Order({
              mainOrderId: mainOrder._id,
              user: userId,
              vendor: vendorId,
              items: orderData.items,
              totalPrice: orderData.totalPrice,
              paymentMethod,
              paymentStatus: paymentMethod === "COD" ? "Pending" : "Processing",
              orderStatus: "Processing",
              shippingAddress: shippingAddressId,
          });

          await newOrder.save();
          createdOrders.push(newOrder._id);
      }

      // Update Main Order with subOrders
      mainOrder.subOrders = createdOrders;
      await mainOrder.save();

      // Create Shiprocket shipments for each sub-order
      const shiprocketResponses = [];
      for (const subOrderId of createdOrders) {
          const subOrder = await Order.findById(subOrderId).populate('items.product');

          // Create Shiprocket order for each subOrder
          const response = await createShiprocketOrder(subOrder, mainOrder, shippingAddress, userId);

          // Save Shiprocket IDs to the subOrder
          subOrder.shiprocketOrderId = response.order_id;
          subOrder.shiprocketShipmentId = response.shipment_id;
          await subOrder.save();

          shiprocketResponses.push(response);
      }

      // Prepare response data based on payment method
      let responseData;

      if (paymentMethod === "COD") {
          await Cart.findOneAndUpdate({ user: userId }, { items: [], totalPrice: 0, coupon: null });
          responseData = {
              message: "Order placed successfully with Cash on Delivery",
              mainOrderId: mainOrder._id,
              orders: createdOrders,
              subtotal,
              platformFee: platformFeeAmount,
              totalAmount,
              shiprocketResponses,
          };
      } 
      else if (paymentMethod === "PhonePe") {
          const merchantTransactionId = randomUUID();
          const amountInPaisa = totalAmount * 100;
          const redirectUrl = `${process.env.FRONTEND_URL}/payment-status?order_id=${mainOrder._id}`;

          const metaInfo = {
              udf1: "order",
              udf2: userId
          };

          const payRequest = StandardCheckoutPayRequest.builder()
              .merchantOrderId(merchantTransactionId)
              .amount(amountInPaisa)
              .redirectUrl(redirectUrl)
              .metaInfo(metaInfo)
              .build();

          const phonepeResponse = await phonePeClient.pay(payRequest);
          
          mainOrder.phonepeTransactionId = merchantTransactionId;
          await mainOrder.save();

          responseData = {
              message: "Proceed to PhonePe Payment",
              paymentUrl: phonepeResponse.redirectUrl,
              mainOrderId: mainOrder._id,
              orders: createdOrders,
              subtotal,
              platformFee: platformFeeAmount,
              totalAmount,
              phonepeTransactionId: merchantTransactionId,
              shiprocketResponses,
          };
      } 
      else {
          responseData = {
              message: "Payment method not implemented yet",
              mainOrderId: mainOrder._id,
              orders: createdOrders,
              subtotal,
              platformFee: platformFeeAmount,
              totalAmount,
              shiprocketResponses,
          };
      }

      // Send a single response at the end
      res.status(201).json(responseData);

  } catch (error) {
    console.error("Error placing order:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
      if (!res.headersSent) {
          res.status(500).json({ 
              message: "Error placing order", 
              error: error.message,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
      }
  }
};
// PhonePe Webhook Handler
exports.phonepeWebhook = async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const callbackBody = JSON.stringify(req.body);

        if (!authorizationHeader) {
            return res.status(401).json({ message: "Authorization header missing" });
        }

        try {
            // Validate the callback
            const callbackResponse = phonePeClient.validateCallback(
                PHONEPE_CALLBACK_USERNAME,
                PHONEPE_CALLBACK_PASSWORD,
                authorizationHeader,
                callbackBody
            );

            // Extract order information
            const merchantOrderId = callbackResponse.payload.orderId; // This is your MT_orderId format
            const state = callbackResponse.payload.state;

            // The orderId is in format MT_xxx, so extract the actual order ID
            const mainOrderId = merchantOrderId.replace('MT_', '');

            // Update order status based on the callback state
            if (state === 'checkout.order.completed') {
                // Payment successful
                await MainOrder.findByIdAndUpdate(mainOrderId, {
                    paymentStatus: 'Completed',
                    orderStatus: 'Confirmed'
                });

                // Update all sub-orders
                await Order.updateMany(
                    { mainOrderId: mainOrderId },
                    {
                        paymentStatus: 'Completed',
                        orderStatus: 'Confirmed'
                    }
                );

                // Clear the cart
                const mainOrder = await MainOrder.findById(mainOrderId);
                if (mainOrder) {
                    await Cart.findOneAndUpdate(
                        { user: mainOrder.user },
                        { items: [], totalPrice: 0, coupon: null }
                    );
                }
            } else if (state === 'checkout.order.failed' || state === 'checkout.transaction.attempt.failed') {
                // Payment failed
                await MainOrder.findByIdAndUpdate(mainOrderId, {
                    paymentStatus: 'Failed',
                    orderStatus: 'Failed'
                });

                await Order.updateMany(
                    { mainOrderId: mainOrderId },
                    {
                        paymentStatus: 'Failed',
                        orderStatus: 'Failed'
                    }
                );
            }

            // Send acknowledgement response
            return res.status(200).json({ status: "Success" });

        } catch (validationError) {
            console.error("PhonePe callback validation error:", validationError);
            return res.status(401).json({ message: "Invalid callback" });
        }
    } catch (error) {
        console.error("PhonePe webhook error:", error);
        return res.status(500).json({ message: "Error processing webhook", error: error.message });
    }
};

// Check payment status endpoint
exports.checkPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        const mainOrder = await MainOrder.findById(orderId);

        if (!mainOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (mainOrder.phonepeTransactionId) {
            try {
                const statusResponse = await phonePeClient.getOrderStatus(mainOrder.phonepeTransactionId);
                const phonepeStatus = statusResponse.state;
        
                // ✅ Update the order in DB if needed
                if (phonepeStatus === "COMPLETED" && mainOrder.paymentStatus !== "Completed") {
                    await MainOrder.findByIdAndUpdate(orderId, {
                        paymentStatus: "Completed",
                        orderStatus: "Confirmed"
                    });
        
                    await Order.updateMany(
                        { mainOrderId: orderId },
                        {
                            paymentStatus: "Completed",
                            orderStatus: "Confirmed"
                        }
                    );
        
                    // Clear the cart
                    await Cart.findOneAndUpdate(
                        { user: mainOrder.user },
                        { items: [], totalPrice: 0, coupon: null }
                    );
                }
        
                if (
                    (phonepeStatus === "FAILED" || phonepeStatus === "FAILURE") &&
                    mainOrder.paymentStatus !== "Failed"
                ) {
                    await MainOrder.findByIdAndUpdate(orderId, {
                        paymentStatus: "Failed",
                        orderStatus: "Failed"
                    });
        
                    await Order.updateMany(
                        { mainOrderId: orderId },
                        {
                            paymentStatus: "Failed",
                            orderStatus: "Failed"
                        }
                    );
                }
        
                return res.status(200).json({
                    orderId: mainOrder._id,
                    paymentStatus: phonepeStatus === "COMPLETED" ? "Completed" : mainOrder.paymentStatus,
                    orderStatus: phonepeStatus === "COMPLETED" ? "Confirmed" : mainOrder.orderStatus,
                    phonepeStatus
                });
            } catch (phonepeError) {
                console.error("Error getting PhonePe status:", phonepeError);
                return res.status(200).json({
                    orderId: mainOrder._id,
                    paymentStatus: mainOrder.paymentStatus,
                    orderStatus: mainOrder.orderStatus,
                    phonepeStatus: "Error fetching status"
                });
            }
        }
        
    } catch (error) {
        console.error("Error checking payment status:", error);
        res.status(500).json({ message: "Error checking payment status", error: error.message });
    }
};



exports.getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch platform fee (assuming there's only one active fee)
        const platformFeeData = await PlatformFee.findOne().sort({ createdAt: -1 }); // Get latest fee
        const platformFee = platformFeeData?.amount || 0; // Default to 0 if not found

        // Fetch user orders
        const orders = await Order.find({ user: userId })
            .populate("items.product")
            .populate("shippingAddress")
            .sort({ createdAt: -1 });

        // Calculate final price for each order
        const ordersWithPlatformFee = orders.map(order => {
            const finalTotal = order.totalPrice + platformFee; // Add platform fee to totalPrice
            return {
                ...order.toObject(), // Convert Mongoose document to plain object
                platformFee,
                finalTotalPrice: finalTotal
            };
        });

        res.status(200).json({ orders: ordersWithPlatformFee });
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders", error: error.message });
    }
};

// Get a single order by ID (GET method)
exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate("items.product")
            .populate("shippingAddress")
            .populate("user");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json({ order });
    } catch (error) {
        res.status(500).json({ message: "Error fetching order", error: error.message });
    }
};

// Update order status (PATCH method)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { orderStatus, paymentStatus } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { orderStatus, paymentStatus },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json({ message: "Order updated successfully", order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: "Error updating order", error: error.message });
    }
};

exports.generateInvoice = async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId)
        .populate({
          path: "user",
          select: "name email mobileNumber company zohoCustomerId",
        })
        .populate({
          path: "items.product",
          select: "name description sku zohoItemId price finalPrice",
        })
        .populate("shippingAddress");
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      let customerId = order.user.zohoCustomerId;
      if (!customerId) {
        const existingCustomer = await searchCustomerInZoho(order.user.email);
        if (existingCustomer) {
          customerId = existingCustomer.contact_id;
          order.user.zohoCustomerId = customerId;
          await order.user.save();
        } else {
          const customerData = {
            contact_name: `${order.shippingAddress.fullName.trim()} (${Date.now()})`,
            company_name: order.user.company || order.shippingAddress.fullName,
            email: order.shippingAddress.email
              ? order.user.email.toLowerCase().trim()
              : null,
            phone: order.shippingAddress.phone,
            contact_type: "customer",
            customer_sub_type: "business",
            billing_address: {
              attention: order.shippingAddress.fullName,
              address: order.shippingAddress.addressLine1 || "Default Address",
              address_line2: order.shippingAddress.addressLine2 || "",
              city: order.shippingAddress.city,
              state: order.shippingAddress.state,
              zip: order.shippingAddress.zipCode,
              country: order.shippingAddress.country,
              phone:
                order.shippingAddress.phone ||
                order.user.mobileNumber ||
                "+0000000000",
            },
          };
          try {
            const newCustomer = await createCustomer(customerData);
            customerId = newCustomer.contact_id;
            order.user.zohoCustomerId = customerId;
            await order.user.save();
          } catch (customerError) {
            customerData.contact_name = `${order.shippingAddress.fullName.trim()} (${Date.now()}-${Math.floor(
              Math.random() * 1000
            )})`;
            const retryCustomer = await createCustomer(customerData);
            customerId = retryCustomer.contact_id;
            order.user.zohoCustomerId = customerId;
            await order.user.save();
          }
        }
      }
      // Product handling
      for (const item of order.items) {
        if (!item.product.zohoItemId) {
          const productData = {
            name: `${item.product.name} (${Date.now()})`,
            rate: item.product.finalPrice || item.product.price,
            description: item.product.description || "",
            sku: item.product.sku || `SKU-${item.product._id}`,
          };
          try {
            const newProduct = await createProductInZoho(productData);
            item.product.zohoItemId = newProduct.item_id;
            await item.product.save();
          } catch (productError) {
            productData.name = `${item.product.name} (${Date.now()}-${Math.floor(
              Math.random() * 1000
            )})`;
            const retryProduct = await createProductInZoho(productData);
            item.product.zohoItemId = retryProduct.item_id;
            await item.product.save();
          }
        }
      }
      // Zoho invoice creation
      const invoiceData = {
        customer_id: customerId,
        currency_id: order.currencyId || 982000000000190,
        line_items: order.items.map((item) => ({
          item_id: item.product.zohoItemId,
          name: item.product.name,
          description: item.product.description,
          quantity: item.quantity,
          rate: item.product.finalPrice || item.product.price,
          sku: item.product.sku || `SKU-${item.product._id}`,
        })),
        reference_number: `ORDER-${orderId}`,
        notes: `Order for ${order.shippingAddress.fullName}`,
      };
      const invoiceResponse = await createInvoice(invoiceData);
      // PDF Generation with QR Code
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: 30,
          bottom: 30,
          left: 50,
          right: 50,
        },
      });
      const invoiceDir = path.join(__dirname, "invoices");
      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
      }
      const invoiceFileName = `invoice-${orderId}-${Date.now()}.pdf`;
      const invoicePath = path.join(invoiceDir, invoiceFileName);
      const invoiceUrl = `${req.protocol}://${req.get(
        "host"
      )}/invoices/${invoiceFileName}`;
      // Generate QR Code
      const qrCodeDataUrl = await qrcode.toDataURL(invoiceUrl);
      const writeStream = fs.createWriteStream(invoicePath);
      doc.pipe(writeStream);
      // Color Palette
      const colors = {
        text: "#000000",
        gray: "#666666",
        border: "#E0E0E0",
        highlight: "#4a90e2",
        warningBox: "#f8f9fa",
      };
      
      // Add signature image URL
      const signatureUrl = "https://i.postimg.cc/Y2GzrHML/Untitled-design.png";
      
      // Function to add footer to each page
      const addFooter = () => {
        // Signature on the right side
        try {
          axios.get(signatureUrl, { responseType: 'arraybuffer' })
            .then(response => {
              const buffer = Buffer.from(response.data, 'binary');
              doc.image(buffer, 400, 700, { width: 100 });
            })
            .catch(err => {
              console.error("Error loading signature:", err);
            });
        } catch (signatureError) {
          console.error("Error with signature:", signatureError);
        }
        
        // Contact information at the bottom
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(colors.gray)
          
          .moveDown(0.5)
          .text("Contact: +91 97784 66748 | Email: support@rigsdock.com", 50, 765, {
            align: "center",
          });
      };
      
      // Set up page event to add footer to each page
      doc.on('pageAdded', addFooter);
      
      doc.font("Helvetica");
      try {
        const logoUrl = "https://i.postimg.cc/K8ftVqFJ/Rigs-Docklogo.png";
        const logoResponse = await axios.get(logoUrl, {
          responseType: "arraybuffer",
        });
        const logoBuffer = Buffer.from(logoResponse.data, "binary");
        doc.image(logoBuffer, 5, 20, { width: 200, height: 130 });
      } catch (logoError) {
        console.error("Error loading logo:", logoError);
      }
      doc
        .fontSize(16)
        .fillColor(colors.text)
        .text("TAX INVOICE", 300, 60, { align: "right" })
        .moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor(colors.gray)
        .text("Original for Recipient", 300, 80, { align: "right" })
        .moveDown(1);
      // Seller & Invoice Details
      doc.fillColor(colors.text).fontSize(9);
      // Create two-column layout for company and invoice details
      doc
        .text("Seller Details", 50, 120)
        .text("Invoice Details", 350, 120)
        .moveDown(0.5);
      doc
        .font("Helvetica-Bold")
        .text("Company Name Pvt. Ltd.", 50, 140)
        .font("Helvetica")
        .text("Corporate Address", 50, 155)
        .text("GSTIN: 07AAPCS1234A1Z1", 50, 170)
        .text("State Code: 07", 50, 185);
      doc
        .text(`Invoice No: ${invoiceResponse.invoice.invoice_number}`, 350, 140)
        .text(`Date: ${new Date().toLocaleDateString()}`, 350, 155)
        .text(`Order ID: ${orderId}`, 350, 170)
        .text(`State: ${order.shippingAddress.state}`, 350, 185);
      // QR Code
      doc.image(qrCodeDataUrl, 500, 120, {
        width: 70,
        height: 70,
      });
      // Billing Address
      doc
        .fontSize(9)
        .text("Billing Address:", 50, 210, { underline: true })
        .text(`${order.shippingAddress.fullName}`, 50, 225)
        .text(`${order.shippingAddress.addressLine1}`, 50, 240)
        .text(
          `${order.shippingAddress.city}, ${order.shippingAddress.state}`,
          50,
          255
        )
        .text(
          `${order.shippingAddress.country} - ${order.shippingAddress.zipCode}`,
          50,
          270
        );
      // Warranty Message Box
      doc.rect(350, 210, 220, 60).fillAndStroke(colors.warningBox, colors.border);
      doc
        .fontSize(9)
        .fillColor(colors.text)
        .font("Helvetica-Bold")
        .text("*Keep this invoice and", 370, 220)
        .text("manufacturer box for", 370, 235)
        .text("warranty purposes.", 370, 250);
      // Line Items Table
      const tableTop = 320;
      const columnWidths = [40, 250, 80, 60, 100];
      const headers = [
        "S.No",
        "Product Description",
        "HSN",
        "Quantity",
        "Total Amount",
      ];
      // Draw Table Header
      doc.lineWidth(0.5).strokeColor(colors.border);
      headers.forEach((header, i) => {
        doc
          .font("Helvetica-Bold")
          .text(
            header,
            50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
            tableTop,
            {
              width: columnWidths[i],
              align: "center",
            }
          );
      });
      // Draw horizontal line under header
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();
      // Line Items
      let yPos = tableTop + 25;
      doc.font("Helvetica");
      order.items.forEach((item, index) => {
        const rowData = [
          index + 1,
          item.product.name,
          item.product.sku || "N/A",
          item.quantity,
          `Rs ${(item.product.finalPrice * item.quantity).toFixed(2)}`,
        ];
        rowData.forEach((data, i) => {
          doc.text(
            data.toString(),
            50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
            yPos,
            {
              width: columnWidths[i],
              align: i === 0 || i === 2 || i === 3 ? "center" : "left",
            }
          );
        });
        // Draw horizontal line
        doc
          .moveTo(50, yPos + 15)
          .lineTo(550, yPos + 15)
          .strokeColor(colors.border)
          .stroke();
        yPos += 20;
      });
      const subtotal = order.items.reduce(
        (sum, item) => sum + item.product.finalPrice * item.quantity,
        0
      );
      const gst = subtotal * 0.18;
      const total = subtotal + gst;
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(colors.text)
        .text("Subtotal", 350, yPos + 10)
        .text(`Rs ${subtotal.toFixed(2)}`, 500, yPos + 10, { align: "right" })
        .text("GST (18%)", 350, yPos + 25)
        .text(`Rs ${gst.toFixed(2)}`, 500, yPos + 25, { align: "right" })
        .font("Helvetica-Bold")
        .text("Total Amount", 350, yPos + 40)
        .text(`Rs ${total.toFixed(2)}`, 500, yPos + 40, { align: "right" });
      
      // Add authentication section
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("For Company Name Pvt. Ltd.", 400, 650, { align: "center" })
        .moveDown(3.5)
        .font("Helvetica")
        .text("Authorized Signatory", 400, 680, { align: "center" });
      
     
        try {
            const signatureResponse = await axios.get(signatureUrl, {
              responseType: "arraybuffer",
            });
            const signatureBuffer = Buffer.from(signatureResponse.data, "binary");
            doc.image(signatureBuffer, 420, 700, { width: 80, height: 40 }); // Adjusted position and size
          } catch (signatureError) {
            console.error("Error loading signature:", signatureError);
          }
          
      // Add footer to the first page
      addFooter();
      
      doc.end();
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
      // Response remains the same
      res.status(201).json({
        message: "Invoice created successfully",
        zohoInvoice: invoiceResponse,
        pdfUrl: invoiceUrl,
        qrCode: qrCodeDataUrl,
        orderDetails: {
          orderId: order._id,
          totalAmount: total,
          customer: order.shippingAddress,
          items: order.items.map((item) => ({
            productName: item.product.name,
            quantity: item.quantity,
            price: item.product.finalPrice,
            total: item.product.finalPrice * item.quantity,
          })),
        },
      });
    } catch (error) {
      console.error("❌ Invoice Generation Error:", error);
      res.status(500).json({
        error: "Invoice generation failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  };