const axios = require('axios');
const Address = require('../../models/User/AddressModel');
const Vendor = require('../../models/Vendor/vendorModel');
const Product = require('../../models/admin/ProductModel');
const Order = require('../../models/User/OrderModel');
const MainOrder = require('../../models/User/MainOrderModel');
const User = require('../../models/User/AuthModel');
const ShiprocketToken = require('../../models/admin/ShiprocketModel');

// 2. Shiprocket Authentication
async function getShiprocketToken() {
  try {
    // Check if a valid token exists in the database
    const tokenDoc = await ShiprocketToken.findOne().sort({ createdAt: -1 });
    
    if (tokenDoc) {
      // If token exists and is not about to expire (e.g., less than 1 hour left)
      const tokenAge = (Date.now() - tokenDoc.createdAt) / 1000; // age in seconds
      if (tokenAge < 82800) { // 23 hours (giving 1-hour buffer)
        return tokenDoc.token;
      }
    }
    
    // If no token exists or it's about to expire, get a new one
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: "bijith.codeedx@gmail.com",
      password: "Rigsdocks@123"
    });
    
    // Save the new token to the database
    const newToken = new ShiprocketToken({
      token: response.data.token
    });
    await newToken.save();
    
    return response.data.token;
  } catch (error) {
    console.error('Error managing Shiprocket token:', error);
    throw error;
  }
}

// 3. Function to explicitly refresh token when needed
async function refreshShiprocketToken() {
  try {
    // Delete existing tokens
    await ShiprocketToken.deleteMany({});
    
    // Get and save new token
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD
    });
    
    const newToken = new ShiprocketToken({
      token: response.data.token
    });
    await newToken.save();
    
    return response.data.token;
  } catch (error) {
    console.error('Error refreshing Shiprocket token:', error);
    throw error;
  }
}

// 3. Create Order on Shiprocket - For each SubOrder
async function createShiprocketOrder(subOrder, mainOrder, shippingAddress, userId) {
  console.log('mainOrder',mainOrder);
  console.log('subOrder:',subOrder)
  try {
    const token = await getShiprocketToken();
    
    // Get vendor details
    const vendor = await Vendor.findById(subOrder.vendor);
    console.log('vendor',vendor);
    const user = await User.findById(userId);
    console.log('user',user);
    
    // Get product details
    const orderItems = [];
    let orderWeight = 0;
    
    for (const item of subOrder.items) {
      const product = await Product.findById(item.product);
      orderItems.push({
        name: product.name,
        sku: product.sku || product._id.toString(),
        units: item.quantity,
        selling_price: item.price / item.quantity,
        discount: 0,
        tax: 0,
        hsn: product.hsn || ''
      });
      
      // Calculate total weight (assuming weight is in kg)
      orderWeight += (product.weight || 0.5) * item.quantity;
    }
    
    // Get address details
    const address = await Address.findById(subOrder.shippingAddress);
    console.log('address',address);
    
    // Format current date for Shiprocket
    const orderDate = new Date().toISOString().split('T')[0];
    
    // Prepare order data for Shiprocket
    const orderData = {
      // Required fields
      order_id: subOrder._id,
      order_date: subOrder.createdAt,
      pickup_location: "Home",
      billing_customer_name: "akshay",
      billing_last_name: "PP",
      billing_address: address.addressLine1,
      billing_city: address.city,
      billing_pincode: parseInt(address.zipCode),
      billing_state: address.state,
      billing_country: address.country,
      billing_email: user.email,
      billing_phone: 9562100653,
      shipping_is_billing: true,
      
      // // Conditional required fields (since shipping_is_billing is false)
      // shipping_customer_name: "Priya",
      // shipping_address: "78 Green View Apartments, Bandra West",
      // shipping_city: "Mumbai",
      // shipping_pincode: 400050,
      // shipping_state: "Maharashtra",
      // shipping_country: "India",
      // shipping_phone: 8765432109,
      
      // Required item details
      order_items: [
        {
          name: "Cotton T-Shirt",
          sku: "TS-COT-BLK-M",
          units: 2,
          selling_price: 799
        },
        {
          name: "Denim Jeans",
          sku: "DJ-BLU-32",
          units: 1,
          selling_price: 1499
        }
      ],
      
      // Required payment info
      payment_method: "Prepaid",
      sub_total: 3097,
      
      // Required package dimensions
      length: 10,
      breadth: 10,
      height: 5,
      weight: 1.2
    }

    console.log("Sending to Shiprocket:", JSON.stringify(orderData));
    
    // Send order to Shiprocket
    const response = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
      orderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // // Save Shiprocket order ID to SubOrder
    // await Order.findByIdAndUpdate(subOrder._id, {
    //   shiprocketOrderId: response.data.order_id,
    //   shiprocketShipmentId: response.data.shipment_id
    // });
    
    return response.data;
  } catch (error) {
    console.error('Error creating Shiprocket order:');
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', JSON.stringify(error.response.data, null, 2));
    console.error('Headers:', error.response.headers);
  } else {
    console.error(error.message);
  }
    throw error;
  }
}

// 4. Track Shipment Status
async function trackShipment(shiprocketOrderId) {
  try {
    const token = await getShiprocketToken();
    
    const response = await axios.get(
      `https://apiv2.shiprocket.in/v1/external/orders/show/${shiprocketOrderId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error tracking shipment:', error);
    throw error;
  }
}

// Function to cancel Shiprocket order
async function cancelShiprocketOrder(shiprocketOrderId) {
  try {
    const token = await getShiprocketToken();
    
    const response = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/orders/cancel',
      {
        ids: [shiprocketOrderId]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error canceling Shiprocket order:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    throw error;
  }
}

// Function to register return order with Shiprocket
async function registerShiprocketReturnOrder(order, product) {
  console.log('order',order);
  try {
      // Get Shiprocket authentication token (you'll need to implement token retrieval)
      const authToken = await getShiprocketToken();
      console.log('pickup_customer_name :',order.user.name)

      // Prepare return order payload
      const returnOrderPayload = {
          order_id: "987654", // Assuming you store Shiprocket order ID in the order model
          order_date: new Date().toISOString().split('T')[0],
          pickup_customer_name: "akshay", // Your registered pickup address ID
          pickup_address: "416, Udyog Vihar III, Sector 20dress",
          pickup_city: order.shippingAddress.city,
          pickup_state: order.shippingAddress.state,
          pickup_country: order.shippingAddress.country,
          pickup_pincode: 679571,
          pickup_email: "bijith@gmail.com",
          pickup_phone: 8921359475,
          shipping_customer_name: "Jane",
          shipping_address: "Castle",
          shipping_city: "Mumbai",
          shipping_country: "India",
          shipping_pincode: 679503,
          shipping_state: "Maharashtra",
          shipping_phone: 9562100653,
          order_items: [{
              sku: 'TS-COT-BLK-M', // Product SKU
              name: 'Cotton T-Shirt',
              units: 1, // Assuming return of one unit
              selling_price: 10
          }],
          // Additional optional fields
          payment_method: 'Prepaid', // or as per your preference
          sub_total: 10,
          length: 10,
          breadth: 15,
          height: 20,
          weight: 1
      };

      // Make API call to Shiprocket
      const response = await axios.post(
          'https://apiv2.shiprocket.in/v1/external/orders/create/return', 
          returnOrderPayload,
          {
              headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
              }
          }
      );

      return response.data;
  } catch (error) {
    console.error('Error creating Shiprocket order:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', error.response.headers);
    } else {
      console.error(error.message);
    }
      throw new Error('Failed to register return order with Shiprocket');
  }
}

// 5. Update Order Status in Database
async function updateOrderStatus(subOrderId, status) {
  try {
    // Update SubOrder status
    await Order.findByIdAndUpdate(subOrderId, { orderStatus: status });
    
    // Get the subOrder
    const subOrder = await Order.findById(subOrderId);
    
    // Get the mainOrder
    const mainOrder = await MainOrder.findById(subOrder.mainOrderId);
    
    // Check if all subOrders have the same status
    const allSubOrders = await Order.find({ 
      _id: { $in: mainOrder.subOrders } 
    });
    
    const allSameStatus = allSubOrders.every(order => order.orderStatus === status);
    
    // If all subOrders have the same status, update mainOrder status
    if (allSameStatus) {
      await MainOrder.findByIdAndUpdate(mainOrder._id, { orderStatus: status });
    }
    
    return { subOrder, mainOrder };
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

// 6. Create Webhook to receive status updates from Shiprocket
// This function would be part of your Express.js API route handling
function shiprocketWebhook(req, res) {
  try {
    const { order_id, status } = req.body;
    
    // Map Shiprocket status to your application status
    let appStatus;
    switch (status.toLowerCase()) {
      case 'new':
        appStatus = 'Processing';
        break;
      case 'pickup scheduled':
      case 'pickup generated':
        appStatus = 'Confirmed';
        break;
      case 'shipped':
        appStatus = 'Shipped';
        break;
      case 'delivered':
        appStatus = 'Delivered';
        break;
      case 'cancelled':
        appStatus = 'Cancelled';
        break;
      default:
        appStatus = 'Processing';
    }
    
    // Find the subOrder by shiprocketOrderId
    Order.findOne({ shiprocketOrderId: order_id })
      .then(subOrder => {
        if (!subOrder) {
          return res.status(404).json({ message: 'Order not found' });
        }
        
        // Update the order status
        return updateOrderStatus(subOrder._id, appStatus);
      })
      .then(() => {
        res.status(200).json({ message: 'Order status updated successfully' });
      })
      .catch(error => {
        console.error('Error in webhook processing:', error);
        res.status(500).json({ message: 'Error processing webhook' });
      });
  } catch (error) {
    console.error('Error in webhook:', error);
    res.status(500).json({ message: 'Error processing webhook' });
  }
}

// 4. Helper function to handle token expiration during API calls
async function callShiprocketAPI(endpoint, method = 'get', data = null) {
  try {
    let token = await getShiprocketToken();
    
    const config = {
      method,
      url: `https://apiv2.shiprocket.in/v1/external/${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    if (data && (method === 'post' || method === 'put')) {
      config.data = data;
    }
    
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // If token expired (401 Unauthorized), refresh token and retry once
      if (error.response && error.response.status === 401) {
        token = await refreshShiprocketToken();
        
        // Update authorization header with new token
        config.headers.Authorization = `Bearer ${token}`;
        
        // Retry the request
        const retryResponse = await axios(config);
        return retryResponse.data;
      }
      
      // For other errors, throw the error
      throw error;
    }
  } catch (error) {
    console.error(`Error calling Shiprocket API (${endpoint}):`, error);
    throw error;
  }
}

module.exports = { createShiprocketOrder,trackShipment,cancelShiprocketOrder,registerShiprocketReturnOrder };