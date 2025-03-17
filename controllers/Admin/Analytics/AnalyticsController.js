const MainOrder = require('../../../models/User/MainOrderModel');

const getTopSellingProducts = (orderData) => {
    const productSales = {};

    orderData.orders.forEach(order => {
        order.subOrders.forEach(subOrder => {
            subOrder.items.forEach(item => {
                const productId = item.product._id;
                const quantity = item.quantity;
                const productDetails = item.product;

                if (productSales[productId]) {
                    productSales[productId].totalQuantity += quantity;
                } else {
                    productSales[productId] = {
                        product: productDetails,
                        totalQuantity: quantity
                    };
                }
            });
        });
    });

    const sortedProducts = Object.keys(productSales).map(productId => ({
        product: productSales[productId].product,
        totalQuantity: productSales[productId].totalQuantity
    })).sort((a, b) => b.totalQuantity - a.totalQuantity);

    return sortedProducts.slice(0, 5);
};

const analyzePeakSellingTime = (orders) => {
    const hourlyOrderCounts = {};

    // Group orders by hour
    orders.forEach(order => {
        const orderHour = new Date(order.createdAt).getHours();
        if (hourlyOrderCounts[orderHour]) {
            hourlyOrderCounts[orderHour]++;
        } else {
            hourlyOrderCounts[orderHour] = 1;
        }
    });

    // Find the hour(s) with the maximum number of orders
    let peakHours = [];
    let maxOrders = 0;

    for (const [hour, count] of Object.entries(hourlyOrderCounts)) {
        if (count > maxOrders) {
            peakHours = [hour];
            maxOrders = count;
        } else if (count === maxOrders) {
            peakHours.push(hour);
        }
    }

    // Format the peak hours in 12-hour format with AM/PM
    const formattedPeakHours = peakHours.map(hour => {
        const startHour = parseInt(hour, 10);
        const endHour = startHour + 1;

        // Convert to 12-hour format with AM/PM
        const formatTime = (time) => {
            if (time === 0) return '12:00 AM'; // Handle midnight
            if (time === 12) return '12:00 PM'; // Handle noon
            if (time < 12) return `${time}:00 AM`;
            return `${time - 12}:00 PM`;
        };

        return `${formatTime(startHour)} - ${formatTime(endHour)}`;
    });

    return {
        peakHours: formattedPeakHours,
        maxOrders: maxOrders
    };
};

// --------------------------------------------------------------

exports.getTopSellingProducts = async (req, res) => {
    try {
        const mainOrders = await MainOrder.find()
            .populate({
                path: 'subOrders',
                populate: {
                    path: 'items.product',
                    model: 'Product'
                }
            });
        // Calculate top-selling products
        const topSellingProducts = getTopSellingProducts({ orders: mainOrders });

        // Return the result
        res.json({ success: true, topSellingProducts });
    } catch (error) {
        console.error('Error fetching top selling products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.getPeakSellingTime = async (req, res) => {
    try {
        // Fetch all main orders
        const mainOrders = await MainOrder.find({}, { createdAt: 1 });

        // Analyze peak selling time
        const peakSellingTime = analyzePeakSellingTime(mainOrders);

        // Return the result
        res.json({ success: true, peakSellingTime });
    } catch (error) {
        console.error('Error fetching peak selling time:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};