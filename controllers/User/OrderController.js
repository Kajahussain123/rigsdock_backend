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
const {
  createInvoice,
  createCustomer,
  createProductInZoho,
  searchCustomerInZoho,
} = require("../../utils/zohoBooksService");


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
    const redirectUrl = `${process.env.FRONTEND_URL}/payment-status?order_id=${merchantTransactionId}`;

    // Create temporary order data without saving to DB
    const orderData = {
        merchantTransactionId,
        userId,
        cartItems: cart.items,
        subtotal,
        platformFee: platformFeeAmount,
        totalAmount,
        shippingAddressId,
        paymentMethod,
        vendorOrders
    };

    // Store temporary order data (use Redis or in-memory cache)
    await cache.set(`temp_order:${merchantTransactionId}`, JSON.stringify(orderData), 3600); // 1 hour expiry

    const metaInfo = {
        udf1: "order",
        udf2: merchantTransactionId // Pass the temp order ID
    };

    const payRequest = StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantTransactionId)
        .amount(amountInPaisa)
        .redirectUrl(redirectUrl)
        .metaInfo(metaInfo)
        .build();

    const phonepeResponse = await phonePeClient.pay(payRequest);

    responseData = {
        message: "Proceed to PhonePe Payment",
        paymentUrl: phonepeResponse.redirectUrl,
        tempOrderId: merchantTransactionId, // Return temp ID instead
        subtotal,
        platformFee: platformFeeAmount,
        totalAmount
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

        // Validate the callback
        const callbackResponse = phonePeClient.validateCallback(
            PHONEPE_CALLBACK_USERNAME,
            PHONEPE_CALLBACK_PASSWORD,
            authorizationHeader,
            callbackBody
        );

        // Extract order information
        const merchantOrderId = callbackResponse.payload.orderId;
        const state = callbackResponse.payload.state;

        if (state === 'checkout.order.completed') {
            // Retrieve the temporary order data from cache
            const tempOrderData = await cache.get(`temp_order:${merchantOrderId}`);
            if (!tempOrderData) {
                return res.status(400).json({ message: "Order data not found or expired" });
            }
            
            const order = JSON.parse(tempOrderData);
            
            // Validate shipping address
            const shippingAddress = await Address.findById(order.shippingAddressId);
            if (!shippingAddress) {
                return res.status(400).json({ message: "Invalid shipping address" });
            }

            // Create Main Order
            const mainOrder = new MainOrder({
                user: order.userId,
                subtotal: order.subtotal,
                platformFee: order.platformFee,
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                paymentStatus: 'Completed',
                orderStatus: 'Confirmed',
                shippingAddress: order.shippingAddressId,
                phonepeTransactionId: merchantOrderId,
                subOrders: []
            });

            await mainOrder.save();

            // Create vendor orders
            const createdOrders = [];
            for (const vendorId in order.vendorOrders) {
                const orderData = order.vendorOrders[vendorId];

                const newOrder = new Order({
                    mainOrderId: mainOrder._id,
                    user: order.userId,
                    vendor: vendorId,
                    items: orderData.items,
                    totalPrice: orderData.totalPrice,
                    paymentMethod: order.paymentMethod,
                    paymentStatus: 'Completed',
                    orderStatus: 'Confirmed',
                    shippingAddress: order.shippingAddressId
                });

                await newOrder.save();
                createdOrders.push(newOrder._id);
                
                // Create Shiprocket shipment
                const response = await createShiprocketOrder(newOrder, mainOrder, shippingAddress, order.userId);
                newOrder.shiprocketOrderId = response.order_id;
                newOrder.shiprocketShipmentId = response.shipment_id;
                await newOrder.save();
            }

            // Update Main Order with subOrders
            mainOrder.subOrders = createdOrders;
            await mainOrder.save();

            // Clear cart and temp order data
            await Cart.findOneAndUpdate(
                { user: order.userId },
                { items: [], totalPrice: 0, coupon: null }
            );
            await cache.del(`temp_order:${merchantOrderId}`);

            return res.status(200).json({ status: "Success" });
        } 
        else if (state === 'checkout.order.failed' || state === 'checkout.transaction.attempt.failed') {
            // Payment failed - just clear the temporary order data
            await cache.del(`temp_order:${merchantOrderId}`);
            return res.status(200).json({ status: "Success" });
        }

        // For other states, just acknowledge
        return res.status(200).json({ status: "Success" });

    } catch (error) {
        console.error("PhonePe webhook error:", {
            message: error.message,
            stack: error.stack,
            request: {
                headers: req.headers,
                body: req.body
            }
        });

        if (error.name === 'ValidationError') {
            return res.status(401).json({ message: "Invalid callback" });
        }

        return res.status(500).json({ 
            message: "Error processing webhook", 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Check payment status endpoint
exports.checkPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        // First check if this is a temporary order ID (before payment completion)
        const tempOrderData = await cache.get(`temp_order:${orderId}`);
        if (tempOrderData) {
            return res.status(200).json({
                status: "pending",
                paymentStatus: "processing",
                message: "Payment still in progress"
            });
        }

        // Check for completed orders
        const mainOrder = await MainOrder.findOne({ 
            $or: [
                { _id: orderId },
                { phonepeTransactionId: orderId }
            ]
        }).populate('subOrders');

        if (!mainOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        // If payment was already marked as completed
        if (mainOrder.paymentStatus === 'Completed') {
            return res.status(200).json({
                status: "completed",
                paymentStatus: "completed",
                orderStatus: mainOrder.orderStatus,
                mainOrderId: mainOrder._id,
                subOrders: mainOrder.subOrders,
                amount: mainOrder.totalAmount,
                paymentMethod: mainOrder.paymentMethod
            });
        }

        // If payment was marked as failed
        if (mainOrder.paymentStatus === 'Failed') {
            return res.status(200).json({
                status: "failed",
                paymentStatus: "failed",
                orderStatus: "failed",
                mainOrderId: mainOrder._id,
                amount: mainOrder.totalAmount,
                paymentMethod: mainOrder.paymentMethod
            });
        }

        // If status is still pending/processing, check with PhonePe
        if (mainOrder.phonepeTransactionId) {
            try {
                const statusResponse = await phonePeClient.getOrderStatus(mainOrder.phonepeTransactionId);
                const phonepeStatus = statusResponse.state;

                // Update the order status based on PhonePe response
                if (phonepeStatus === "COMPLETED" && mainOrder.paymentStatus !== "Completed") {
                    await MainOrder.findByIdAndUpdate(mainOrder._id, {
                        paymentStatus: 'Completed',
                        orderStatus: 'Confirmed'
                    });

                    await Order.updateMany(
                        { mainOrderId: mainOrder._id },
                        {
                            paymentStatus: 'Completed',
                            orderStatus: 'Confirmed'
                        }
                    );

                    // Clear the cart
                    await Cart.findOneAndUpdate(
                        { user: mainOrder.user },
                        { items: [], totalPrice: 0, coupon: null }
                    );
                }
                else if ((phonepeStatus === "FAILED" || phonepeStatus === "FAILURE") && 
                        mainOrder.paymentStatus !== "Failed") {
                    await MainOrder.findByIdAndUpdate(mainOrder._id, {
                        paymentStatus: 'Failed',
                        orderStatus: 'Failed'
                    });

                    await Order.updateMany(
                        { mainOrderId: mainOrder._id },
                        {
                            paymentStatus: 'Failed',
                            orderStatus: 'Failed'
                        }
                    );
                }

                return res.status(200).json({
                    status: phonepeStatus.toLowerCase(),
                    paymentStatus: phonepeStatus === "COMPLETED" ? "completed" : 
                                    (phonepeStatus === "FAILED" ? "failed" : "processing"),
                    orderStatus: phonepeStatus === "COMPLETED" ? "confirmed" : 
                                (phonepeStatus === "FAILED" ? "failed" : "processing"),
                    mainOrderId: mainOrder._id,
                    amount: mainOrder.totalAmount,
                    paymentMethod: mainOrder.paymentMethod
                });

            } catch (phonepeError) {
                console.error("Error checking PhonePe status:", phonepeError);
                // Return current status if PhonePe check fails
                return res.status(200).json({
                    status: "unknown",
                    paymentStatus: mainOrder.paymentStatus.toLowerCase(),
                    orderStatus: mainOrder.orderStatus.toLowerCase(),
                    mainOrderId: mainOrder._id,
                    amount: mainOrder.totalAmount,
                    paymentMethod: mainOrder.paymentMethod,
                    message: "Unable to verify payment status with PhonePe"
                });
            }
        }

        // Default response for orders without PhonePe transaction ID
        return res.status(200).json({
            status: mainOrder.paymentStatus.toLowerCase(),
            paymentStatus: mainOrder.paymentStatus.toLowerCase(),
            orderStatus: mainOrder.orderStatus.toLowerCase(),
            mainOrderId: mainOrder._id,
            amount: mainOrder.totalAmount,
            paymentMethod: mainOrder.paymentMethod
        });

    } catch (error) {
        console.error("Error checking payment status:", {
            message: error.message,
            stack: error.stack,
            orderId: req.params.orderId
        });

        return res.status(500).json({ 
            message: "Error checking payment status", 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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

exports.getOrdersByMainOrderId = async (req, res) => {
  try {
    const { mainOrderId } = req.params;
    
    // Fetch platform fee information
    const platformFee = await PlatformFee.findOne();

    const orders = await Order.find({ mainOrderId })
      .populate({
        path: "items.product",
        populate: [
          { path: "owner" }, // Populate seller info
        ],
      })
      .populate("shippingAddress")
      .populate("user");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Orders not found" });
    }

    // Include platform fee information in the response
    res.status(200).json({ 
      orders,
      platformFee: platformFee || { feeType: "percentage", amount: 0 } // Default values if fee not set
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
};


exports.generateInvoiceForMainOrder = async (req, res) => {
  try {
    const { mainOrderId } = req.params;

    // Fetch platform fee information
    const platformFee = await PlatformFee.findOne();
    
    const orders = await Order.find({ mainOrderId })
      .populate({
        path: "items.product",
        populate: [{ path: "owner" }],
      })
      .populate("shippingAddress")
      .populate("user");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "Orders not found" });
    }

    const user = orders[0].user;
    const shippingAddress = orders[0].shippingAddress;

    const determineTaxType = (buyerState, sellerState) => {
      // Convert states to lowercase for comparison
      buyerState = (buyerState || "").toLowerCase().trim();
      sellerState = (sellerState || "").toLowerCase().trim();
    
      // If both in Kerala (or same state), use CGST+SGST (intra-state)
      if (!buyerState || !sellerState || buyerState === sellerState) {
        return "intra-state";
      } else {
        return "inter-state";
      }
    };

    const getTaxId = (taxType) => {
      if (taxType === "intra-state") {
        return "2520220000000033193"; // GST18 (new intra-state)
      } else {
        return "2520220000000033091"; // IGST18 (new inter-state)
      }
    };
    
    
    
    let customerId = user.zohoCustomerId;
    if (!customerId) {
      const existingCustomer = await searchCustomerInZoho(user.email);
      if (existingCustomer) {
        customerId = existingCustomer.contact_id;
        user.zohoCustomerId = customerId;
        await user.save();
      } else {
        const customerData = {
          contact_name: `${
            shippingAddress?.firstName?.trim() || "Customer"
          } (${Date.now()})`,
          company_name: user.company || shippingAddress.firstName,
          email: user.email,
          phone: shippingAddress.phone,
          contact_type: "customer",
          customer_sub_type: "business",
          billing_address: {
            attention: `${shippingAddress?.firstName?.trim() || ""} ${
              shippingAddress?.lastName?.trim() || ""
            }`.trim(),
            address: shippingAddress.addressLine1 || "Default Address",
            address_line2: shippingAddress.addressLine2 || "",
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zipCode,
            country: shippingAddress.country,
            phone: shippingAddress.phone || user.mobileNumber || "+0000000000",
          },
        };
        try {
          const newCustomer = await createCustomer(customerData);
          customerId = newCustomer.contact_id;
          user.zohoCustomerId = customerId;
          await user.save();
        } catch (customerError) {
          customerData.contact_name = `${
            shippingAddress.firstName?.trim() || "Customer"
          } (${Date.now()}-${Math.floor(Math.random() * 1000)})`;

          const retryCustomer = await createCustomer(customerData);
          customerId = retryCustomer.contact_id;
          user.zohoCustomerId = customerId;
          await user.save();
        }
      }
    }

    // Process products for Zoho
    for (const order of orders) {
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
            productData.name = `${
              item.product.name
            } (${Date.now()}-${Math.floor(Math.random() * 1000)})`;
            const retryProduct = await createProductInZoho(productData);
            item.product.zohoItemId = retryProduct.item_id;
            await item.product.save();
          }
        }
      }
    }

    // Prepare line items with appropriate tax IDs
    const lineItems = [];

    for (const order of orders) {
      for (const item of order.items) {
        const taxType = determineTaxType(
          order.shippingAddress.state,
          item.product.owner.state
        );
        
        lineItems.push({
          item_id: item.product.zohoItemId,
          name: item.product.name,
          description: item.product.description,
          quantity: item.quantity,
          rate: item.product.finalPrice || item.product.price,
          tax_id: getTaxId(taxType), // Use the new function
          sku: item.product.sku || `SKU-${item.product._id}`
        });
      }
    }

    // Add Platform Fee as a line item
    if (platformFee) {
      // For Zoho invoice, include platform fee
      lineItems.push({
        name: "RigsDock Platform Fee",
        description: "Service charge for using RigsDock platform",
        quantity: 1,
        rate: platformFee.feeType === "fixed" ? platformFee.amount : 
          (orders.reduce((sum, order) => sum + order.totalAmount, 0) * platformFee.amount / 100),
        tax_id: getTaxId("intra-state") // Assuming platform fee is always intra-state
      });
    }

    const debugTaxInfo = (orders) => {
      console.log("===== TAX DEBUGGING INFO =====");
      
      for (const order of orders) {
        for (const item of order.items) {
          const buyerState = order.shippingAddress.state || "";
          const sellerState = item.product.owner.state || "";
          
          const taxType = determineTaxType(buyerState, sellerState);
          
          console.log(`Order ID: ${order._id}`);
          console.log(`Product: ${item.product.name}`);
          console.log(`Buyer State: "${buyerState}"`);
          console.log(`Seller State: "${sellerState}"`);
          console.log(`Tax Type: ${taxType}`);
          console.log("----------------------------");
        }
      }
      
      // Log all available tax IDs for reference
      console.log("\n===== AVAILABLE TAX IDS =====");
      // You can fetch this from your Zoho API or hardcode the values from paste-2.txt
      const taxes = [
        { id: "2520220000000033175", name: "GST0", percentage: 0 },
        { id: "2520220000000033187", name: "GST12", percentage: 12 },
        { id: "2520220000000033193", name: "GST18", percentage: 18 },
        { id: "2520220000000033199", name: "GST28", percentage: 28 },
        { id: "2520220000000033181", name: "GST5", percentage: 5 },
        { id: "2520220000000033085", name: "IGST0", percentage: 0 },
        { id: "2520220000000033089", name: "IGST12", percentage: 12 },
        { id: "2520220000000033091", name: "IGST18", percentage: 18 },
        { id: "2520220000000033093", name: "IGST28", percentage: 28 },
        { id: "2520220000000033087", name: "IGST5", percentage: 5 }
      ];
      
      
      taxes.forEach(tax => {
        console.log(`${tax.name} (${tax.percentage}%): ${tax.id}`);
      });
      
      console.log("=============================");
    };
    
    // Then call this function before your invoice creation
    debugTaxInfo(orders);
    // Zoho invoice creation with tax IDs
    const invoiceData = {
      customer_id: customerId,
      currency_id: orders[0].currencyId || 982000000000190,
      line_items: lineItems,
      reference_number: `ORDER-${mainOrderId}`,
      notes: `Order for ${
        shippingAddress.firstName && shippingAddress.lastName
          ? `${shippingAddress.firstName} ${shippingAddress.lastName}`
          : "Customer"
      }`,
    };

    const invoiceResponse = await createInvoice(invoiceData);

    // PDF Generation
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

    const invoiceDir = path.join(__dirname, "uploads"); // directly into /uploads
if (!fs.existsSync(invoiceDir)) {
  fs.mkdirSync(invoiceDir, { recursive: true });
}

const invoiceFileName = `invoice-${mainOrderId}-${Date.now()}.pdf`;
const invoicePath = path.join(invoiceDir, invoiceFileName);
const invoiceUrl = `${req.protocol}://${req.get("host")}/uploads/${invoiceFileName}`;
    const upiId = "yourupiid@bank";       
    const payeeName = "Your Name";         // Your name or company name
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&cu=INR`;
    // Generate QR Code
    const qrCodeDataUrl = await qrcode.toDataURL(upiUrl);
    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);

    // Define colors
    const colors = {
      text: "#000000",
      gray: "#666666",
      border: "#E0E0E0",
      highlight: "#4a90e2",
      warningBox: "#f8f9fa",
      platformFeeHighlight: "#ff9800", // Color for platform fee section
    };

    // Add logo URL - only need to add this once at the start
    const logoUrl = "https://i.postimg.cc/K8ftVqFJ/Rigs-Docklogo.png";
    const signatureUrl = "https://i.postimg.cc/Y2GzrHML/Untitled-design.png";

    // Function to add footer to each page
    const addFooter = () => {
      const footerY = doc.page.height - 50;
      // Contact information at the bottom
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.gray)
        .text(
          "Contact: +91 97784 66748 | Email: support@rigsdock.com",
          50,
          footerY,
          {
            width: doc.page.width - 100,
            align: "center",
          }
        );
    };

    // Set up page event to add footer to each page
    doc.on("pageAdded", addFooter);

    // Clear first auto-generated page and start fresh
    doc.moveDown(0); // Move to top of first page

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

    // Create separate invoice pages for each vendor/seller
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const vendor = order.items[0].product.owner; // Assuming all items in an order have the same vendor

      // Add a new page for vendors beyond the first one
      if (i > 0) {
        doc.addPage();
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

      // Vendor information
      doc
        .font("Helvetica-Bold")
        .text(`${vendor.businessname || "Vendor"} Pvt. Ltd.`, 50, 140)
        .font("Helvetica")
        .text(`${vendor.address || "Corporate Address"}`, 50, 155)
        .text(`GSTIN: ${vendor.gst || "Pending"}`, 50, 170)
        .text(`State: ${vendor.state || "Pending"}`, 50, 185);

      doc
        .text(
          `Invoice No: ${invoiceResponse.invoice.invoice_number}-${i + 1}`,
          350,
          140
        )
        .text(`Date: ${new Date().toLocaleDateString()}`, 350, 155)
        .text(`Order ID: ${order._id}`, 350, 170)
        .text(`State: ${order.shippingAddress.state}`, 350, 185);

      // QR Code
      doc.image(qrCodeDataUrl, 500, 120, {
        width: 70,
        height: 70,
      });

      // Get shipping address fields with default values
      const shippingAddress = order.shippingAddress || {};
      // Access data through the _doc property
      const shippingAddressData = shippingAddress._doc || shippingAddress;

      const firstName = shippingAddressData.firstName || "Customer";
      const lastName = shippingAddressData.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();

      // Billing Address with fixed name
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("Billing Address:", 50, 210, { underline: true })
        .font("Helvetica")
        .text(fullName, 50, 225)
        .text(`${order.shippingAddress.addressLine1 || ""}`, 50, 240)
        .text(`${order.shippingAddress.addressLine2 || ""}`, 50, 255)
        .text(
          `${order.shippingAddress.city || ""}, ${
            order.shippingAddress.state || ""
          }`,
          50,
          270
        )
        .text(
          `${order.shippingAddress.country || ""} - ${
            order.shippingAddress.zipCode || ""
          }`,
          50,
          285
        )
        .text(`Phone: ${order.shippingAddress.phone || "N/A"}`, 50, 300);

      // Warranty Message Box with better alignment
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

      // Line Items Table with improved alignment
      const tableTop = 320;
      const columnWidths = [35, 200, 70, 55, 110]; // Adjusted width for product description to fit tax column
      const rowHeight = 25;
      const headers = [
        "S.No",
        "Product Description",
        "HSN",
        "Quantity",
        "Total Amount",
      ];

      // Draw Table Header with better styling
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

      // Line Items for this vendor's order with improved styling
      let yPos = tableTop + 25;
      doc.font("Helvetica").fillColor(colors.text);

      // Add alternating row colors for better readability
      let isEvenRow = false;

      order.items.forEach((item, index) => {
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
          `Rs ${(item.product.finalPrice * item.quantity).toFixed(2)}`,
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

      // Calculate subtotal for this vendor's order with GST tax structure
      const subtotal = order.items.reduce(
        (sum, item) => sum + item.product.finalPrice * item.quantity,
        0
      );

      // Determine tax type based on shipping and vendor states
      const taxType = determineTaxType(
        order.shippingAddress.state,
        vendor.state
      );

      const gstRate = 0.18; // 18% GST rate
      const gstAmount = subtotal * gstRate;
      const total = subtotal + gstAmount;

      const priceWidth = 90;
      const labelX = 360;
      const priceX = 450;

      // Add box around totals section with improved alignment
      doc
        .rect(350, yPos + 5, 200, 80) // Increased height to accommodate more tax lines
        .fillAndStroke("#F9F9F9", colors.border);

      // Left-align labels and right-align amounts
      doc.font("Helvetica").fontSize(9).fillColor(colors.text);

      // Subtotal row
      doc.text("Subtotal", labelX, yPos + 10);
      doc.text(`Rs ${subtotal.toFixed(2)}`, priceX, yPos + 10, {
        align: "right",
        width: priceWidth,
      });

      // Tax rows - different display based on tax type
      if (taxType === "intra-state") {
        // CGST and SGST (9% each)
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
        // IGST (18%)
        doc.text("IGST (18%)", labelX, yPos + 32); // Centered if only one tax line
        doc.text(`Rs ${gstAmount.toFixed(2)}`, priceX, yPos + 32, {
          align: "right",
          width: priceWidth,
        });
      }

      // Total row with bold font
      doc.font("Helvetica-Bold");
      doc.text("Total Amount", labelX, yPos + 55);
      doc.text(`Rs ${total.toFixed(2)}`, priceX, yPos + 55, {
        align: "right",
        width: priceWidth,
      });
    }

    // Add Platform Fee Invoice as a separate page - FLIPKART STYLE
    if (platformFee) {
      doc.addPage();
      
      // Add logo again on the platform fee page
      try {
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
        .fillColor(colors.platformFeeHighlight)
        .text("PLATFORM FEE INVOICE", 300, 60, { align: "right" })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor(colors.gray)
        .text("Original for Recipient", 300, 80, { align: "right" })
        .moveDown(1);

      // Seller & Invoice Details for platform fee
      doc.fillColor(colors.text).fontSize(9);

      // Create two-column layout for company and invoice details
      doc
        .text("Service Provider", 50, 120)
        .text("Invoice Details", 350, 120)
        .moveDown(0.5);

      // RigsDock information as service provider
      doc
      .font("Helvetica-Bold")
      .text("RigsDock Pvt. Ltd.", 50, 140)
      .font("Helvetica")
      .text("GSTIN: 32EJQPK8494B1ZV", 50, 155) // Keep GSTIN as it's important for tax
      .text("State: Kerala", 50, 170); // Keep state as it's needed for tax calculation

      doc
        .text(
          `Invoice No: ${invoiceResponse.invoice.invoice_number}-PF`,
          350,
          140
        )
        .text(`Date: ${new Date().toLocaleDateString()}`, 350, 155)
        .text(`Order ID: ${mainOrderId}`, 350, 170)
        .text(`State: Karnataka`, 350, 185);

      // QR Code
      doc.image(qrCodeDataUrl, 500, 120, {
        width: 70,
        height: 70,
      });

      // Billing Address reused from first order
      const shippingAddress = orders[0].shippingAddress || {};
      const shippingAddressData = shippingAddress._doc || shippingAddress;
      const firstName = shippingAddressData.firstName || "Customer";
      const lastName = shippingAddressData.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("Billing Address:", 50, 210, { underline: true })
        .font("Helvetica")
        .text(fullName, 50, 225)
        .text(`${shippingAddress.addressLine1 || ""}`, 50, 240)
        .text(`${shippingAddress.addressLine2 || ""}`, 50, 255)
        .text(
          `${shippingAddress.city || ""}, ${
            shippingAddress.state || ""
          }`,
          50,
          270
        )
        .text(
          `${shippingAddress.country || ""} - ${
            shippingAddress.zipCode || ""
          }`,
          50,
          285
        )
        .text(`Phone: ${shippingAddress.phone || "N/A"}`, 50, 300);

      // Platform fee explanation box
      doc
        .rect(350, 210, 220, 60)
        .fillAndStroke(colors.warningBox, colors.border);
      doc
        .fontSize(9)
        .fillColor(colors.text)
        .font("Helvetica-Bold")
        .text("Platform Fee Explanation:", 370, 225)
        .font("Helvetica")
        .text("This fee is for services provided", 370, 240)
        .text("by RigsDock marketplace platform.", 370, 255);

      // Platform Fee Table
      const tableTop = 320;
      const columnWidths = [35, 290, 70, 45, 90]; // Adjusted for better alignment
      const rowHeight = 25;
      const headers = [
        "S.No",
        "Service Description",
        "SAC",
        "Quantity",
        "Total Amount",
      ];

      // Draw Table Header with platform fee color
      doc.lineWidth(0.5).strokeColor(colors.border);
      doc
        .rect(50, tableTop - 5, 530, 25)
        .fillAndStroke(colors.platformFeeHighlight, colors.border);

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

      // Calculate platform fee amount
      const totalOrderAmount = orders.reduce((sum, order) => {
        return sum + order.items.reduce(
          (itemSum, item) => itemSum + (item.product.finalPrice * item.quantity),
          0
        );
      }, 0);
      
      const platformFeeAmount = platformFee.feeType === "fixed" 
        ? platformFee.amount 
        : (totalOrderAmount * platformFee.amount / 100);

      // Add platform fee line item
      let yPos = tableTop + 25;
      doc.font("Helvetica").fillColor(colors.text);

      // Platform fee row
      doc
        .rect(50, yPos - 5, 530, rowHeight)
        .fillColor("#F9F9F9")
        .fill();
      doc.fillColor(colors.text);

      const platformFeeDescription = platformFee.feeType === "fixed"
        ? "RigsDock Platform Service Fee (Fixed)"
        : `RigsDock Platform Service Fee (${platformFee.amount}% of order value)`;

      const rowData = [
        1,
        platformFeeDescription,
        "9997", // SAC code for e-commerce services
        1,
        `Rs ${platformFeeAmount.toFixed(2)}`,
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

      yPos += rowHeight + 10;

      // Tax calculation for platform fee
      const gstRate = 0.18; // 18% GST rate
      const platformFeeTax = platformFeeAmount * gstRate;
      const platformFeeTotal = platformFeeAmount + platformFeeTax;

      const priceWidth = 90;
      const labelX = 360;
      const priceX = 450;

      // Add box around totals section
      doc
        .rect(350, yPos + 5, 200, 80)
        .fillAndStroke("#F9F9F9", colors.border);

      // Left-align labels and right-align amounts
      doc.font("Helvetica").fontSize(9).fillColor(colors.text);

      // Subtotal row
      doc.text("Subtotal", labelX, yPos + 10);
      doc.text(`Rs ${platformFeeAmount.toFixed(2)}`, priceX, yPos + 10, {
        align: "right",
        width: priceWidth,
      });

      // Assume platform fee is intra-state (CGST+SGST)
      const cgst = platformFeeTax / 2;
      const sgst = platformFeeTax / 2;

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

      // Total row with bold font
      doc.font("Helvetica-Bold");
      doc.text("Total Amount", labelX, yPos + 55);
      doc.text(`Rs ${platformFeeTotal.toFixed(2)}`, priceX, yPos + 55, {
        align: "right",
        width: priceWidth,
      });

      // Add a note explaining the platform fee
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.gray)
        .text(
          "Note: This is a separate invoice for the RigsDock platform services fee. This fee is charged for facilitating the transaction between buyers and sellers on our marketplace platform.",
          50,
          yPos + 100,
          {
            width: 500,
            align: "left",
          }
        );
    }

  
   const pageWidth = doc.page.width;
   const pageHeight = doc.page.height;
   const footerHeight = 50;
   const signatureHeight = 80;
   const signatureY = pageHeight - footerHeight - signatureHeight;

   doc.y = signatureY;

   // Add authentication section on last page only
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

     // Move signature image slightly more left than text
     doc.image(signatureBuffer, pageWidth - 170, signatureY + 15, {
       width: 80,
       height: 40,
     });
   } catch (signatureError) {
     console.error("Error loading signature:", signatureError);
   }

   // Add "Authorized Signatory" slightly more left than signature
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

   // Calculate grand total for all orders with proper tax breakdown
   const grandTotal = orders.reduce((total, order) => {
     const orderSubtotal = order.items.reduce(
       (sum, item) => sum + item.product.finalPrice * item.quantity,
       0
     );
     return total + orderSubtotal * 1.18; // Including GST
   }, 0);

   // Calculate platform fee for grand total
   let platformFeeAmount = 0;
   let platformFeeTax = 0;
   if (platformFee) {
     platformFeeAmount = platformFee.feeType === "fixed" 
       ? platformFee.amount 
       : (grandTotal * platformFee.amount / 100);
     platformFeeTax = platformFeeAmount * 0.18; // 18% GST on platform fee
   }

   // Add platform fee to grand total
   const finalGrandTotal = grandTotal + platformFeeAmount + platformFeeTax;

   // Format order details for response with tax breakdown
   const orderDetails = orders.map((order) => {
     const subtotal = order.items.reduce(
       (sum, item) => sum + item.product.finalPrice * item.quantity,
       0
     );
     const taxType = determineTaxType(
       order.shippingAddress.state,
       order.items[0].product.owner.state
     );
     const gstAmount = subtotal * 0.18;

     let taxBreakdown;
     if (taxType === "intra-state") {
       taxBreakdown = {
         cgst: gstAmount / 2,
         sgst: gstAmount / 2,
         igst: 0,
       };
     } else {
       taxBreakdown = {
         cgst: 0,
         sgst: 0,
         igst: gstAmount,
       };
     }

     return {
       orderId: order._id,
       vendorName: order.items[0].product.owner.businessname,
       subtotal: subtotal,
       taxType: taxType,
       taxBreakdown: taxBreakdown,
       totalAmount: subtotal + gstAmount,
       customer: order.shippingAddress,
       items: order.items.map((item) => ({
         productName: item.product.name,
         quantity: item.quantity,
         price: item.product.finalPrice,
         total: item.product.finalPrice * item.quantity,
       })),
     };
   });

   // Include platform fee details in response
   let platformFeeDetails = null;
   if (platformFee) {
     platformFeeDetails = {
       feeType: platformFee.feeType,
       amount: platformFee.feeType === "fixed" ? platformFee.amount : `${platformFee.amount}%`,
       calculatedAmount: platformFeeAmount,
       taxBreakdown: {
         cgst: platformFeeTax / 2,
         sgst: platformFeeTax / 2,
         igst: 0,
       },
       totalWithTax: platformFeeAmount + platformFeeTax
     };
   }

   // Send response
   res.status(201).json({
     message: "Invoice created successfully",
     zohoInvoice: invoiceResponse,
     pdfUrl: invoiceUrl,
     qrCode: qrCodeDataUrl,
     mainOrderId,
     grandTotal: finalGrandTotal,
     orderDetails,
     platformFee: platformFeeDetails
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