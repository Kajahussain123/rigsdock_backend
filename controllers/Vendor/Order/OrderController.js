const Order = require('../../../models/User/OrderModel');
const Product = require('../../../models/admin/ProductModel');
const PlatformFee = require('../../../models/admin/PlatformFeeModel');

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
      .populate({
        path: 'items.product',
        populate: {
          path: 'owner',
          model: 'Vendor' // Make sure this matches your ownerType model name
        }
      })
      .populate("shippingAddress");
    // console.log(orders);

    const platformFeeData = await PlatformFee.findOne().sort({ createdAt: -1 });
    const platformFee = platformFeeData?.amount || 0;

    const processedOrders = orders
            .map(order => {
                // Filter items to include only vendor's products
                const filteredItems = order.items.filter(item => 
                    productIds.some(id => id.toString() === item.product._id.toString())
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
    res.status(500).send({ error: "An error occurred while fetching orders." });
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


exports.updateOrderStatus = async(req,res) => {
    try {
        const { orderStatus } = req.body;
        const { orderId } = req.params;
        if (!orderStatus) {
            return res.status(400).json({ message: "orderStatus is required" });
        }
        const updatedOrder = await Order.findByIdAndUpdate(orderId,{orderStatus},{ new: true });
        if(!updatedOrder){
            return res.status(404).json({ message: "order status not updated" });
        }
        res.status(200).json({ message: "order status updated", updatedOrder });
    } catch (error) {
        res.status(500).json({ message: 'Error updating order status', error:error.message })
    }
}