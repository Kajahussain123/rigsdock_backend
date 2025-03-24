const Order = require('../../../models/User/OrderModel');
const Product = require('../../../models/admin/ProductModel');

// get all order by vendor id
exports.getAllOrders = async(req,res) => {
    try {
    // Find all products owned by the logged-in vendor
    const vendorProducts = await Product.find({ owner: req.user.id }).select("_id");
    console.log(vendorProducts)

    // Extract product IDs
    const productIds = vendorProducts.map(product => product._id);
    console.log(productIds)

    // Find all orders that contain these products
    const orders = await Order.find({ "items.product": { $in: productIds } })
      .populate("user", "name email")
      .populate("items.product", "name price owner")
      .populate("shippingAddress");
    // console.log(orders);

    const filteredOrders = orders
    .map(order => {
      console.log("Original Order Items:", order.items);
      // Filter items to include only the vendor's products
      order.items = order.items.filter(item => {
        // Convert both IDs to strings for comparison
        const itemProductIdString = item.product._id.toString();
        const isVendorProduct = productIds.some(productId => productId.toString() === itemProductIdString);
        console.log(`Item ${itemProductIdString} belongs to vendor: ${isVendorProduct}`);
        return isVendorProduct;
      });
  
      console.log("Filtered Order Items:", order.items);
  
      // Recalculate the total price based on the filtered items
      order.totalPrice = order.items.reduce((total, item) => total + item.price * item.quantity, 0);
  
      return order;
    })
    // Remove orders that no longer have any items after filtering
    .filter(order => {
      console.log(`Order ${order._id} has items: ${order.items.length > 0}`);
      return order.items.length > 0;
    });
    console.log(filteredOrders)

    res.status(200).send(filteredOrders);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "An error occurred while fetching orders." });
  }
}

// Get vendor order by ID
exports.getOrderById = async (req, res) => {
  const { orderId } = req.params;

  try {
    // Find the order by ID
    const order = await Order.findById(orderId)
      .populate("user", "name email")
      .populate("items.product", "name price owner")
      .populate("shippingAddress");

    if (!order) {
      return res.status(404).send({ error: "Order not found." });
    }

    // Find all products owned by the logged-in vendor
    const vendorProducts = await Product.find({ owner: req.user.id }).select("_id");

    // Extract product IDs
    const productIds = vendorProducts.map(product => product._id.toString());

    // Filter items to include only the vendor's products
    order.items = order.items.filter(item => {
      const itemProductId = item.product._id.toString();
      return productIds.includes(itemProductId);
    });

    // Recalculate the total price based on the filtered items
    order.totalPrice = order.items.reduce((total, item) => total + item.price * item.quantity, 0);

    // If no items belong to the vendor, return an empty response
    if (order.items.length === 0) {
      return res.status(200).send({ message: "No items in this order belong to the logged-in vendor." });
    }

    // Return the filtered order
    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send({ error: "An error occurred while fetching the order." });
  }
};