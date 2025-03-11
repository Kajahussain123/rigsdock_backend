const Order = require('../../../models/User/OrderModel');
const mongoose = require('mongoose');

// Helper function to calculate total sales for a logged-in vendor
const calculateVendorSales = async (startDate, endDate, vendorId) => {
  const orders = await Order.find({
    createdAt: { $gte: startDate, $lt: endDate },
    paymentStatus: "Paid",
  }).populate({
    path: "items.product",
    match: { owner: vendorId }, // Filter products owned by the vendor
  });

  // Filter orders that contain at least one product owned by the vendor
  const vendorOrders = orders.filter((order) =>
    order.items.some((item) => item.product && item.product.owner.toString() === vendorId)
  );

  // Calculate total sales for the vendor
  return vendorOrders.reduce((total, order) => {
    const vendorItemsTotal = order.items
      .filter((item) => item.product && item.product.owner.toString() === vendorId)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
    return total + vendorItemsTotal;
  }, 0);
};

// Helper function to calculate total products ordered for a logged-in vendor
const calculateVendorProductsOrdered = async (startDate, endDate, vendorId) => {
  const orders = await Order.find({
    createdAt: { $gte: startDate, $lt: endDate },
    paymentStatus: "Paid",
  }).populate({
    path: "items.product",
    match: { owner: vendorId }, // Filter products owned by the vendor
  });

  // Filter orders that contain at least one product owned by the vendor
  const vendorOrders = orders.filter((order) =>
    order.items.some((item) => item.product && item.product.owner.toString() === vendorId)
  );

  // Calculate total products ordered for the vendor
  return vendorOrders.reduce((total, order) => {
    const vendorItemsTotal = order.items
      .filter((item) => item.product && item.product.owner.toString() === vendorId)
      .reduce((sum, item) => sum + item.quantity, 0);
    return total + vendorItemsTotal;
  }, 0);
};

// Helper function to calculate pending orders for a logged-in vendor
const calculateVendorPendingOrders = async (startDate, endDate, vendorId) => {
  const pendingOrders = await Order.countDocuments({
    createdAt: { $gte: startDate, $lt: endDate },
    orderStatus: { $in: ["Processing", "Shipped"] }, // Filter by pending statuses
    "items.product": { $exists: true }, // Ensure items.product exists
  }).populate({
    path: "items.product",
    match: { owner: vendorId }, // Filter products owned by the vendor
  });

  return pendingOrders;
};

const calculateVendorMonthlySales = async (year, vendorId) => {
  // Create match condition based on whether year is provided
  const matchCondition = { paymentStatus: "Paid" };

  // Add year filter if provided
  if (year) {
    matchCondition["$expr"] = {
      $eq: [{ $year: "$createdAt" }, parseInt(year)],
    };
  }

  const monthlySales = await Order.aggregate([
    {
      $match: matchCondition, // Only consider paid orders with optional year filter
    },
    {
      $unwind: "$items", // Unwind the items array to filter by product owner
    },
    {
      $lookup: {
        from: "products", // Join with the Product collection
        localField: "items.product",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    {
      $unwind: "$productDetails", // Unwind the productDetails array
    },
    {
      $match: { "productDetails.owner": new mongoose.Types.ObjectId(vendorId) }, // Filter by vendor's products
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        totalSales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, // Sum up the price * quantity
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 }, // Sort by year and month
    },
  ]);

  // Get the current year and month
  const currentDate = new Date();
  const currentYear = year ? parseInt(year) : currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Months are 1-based (1 = January, 12 = December)

  // Generate only the months from January to the current month
  const relevantMonths = Array.from({ length: currentMonth }, (_, index) => {
    const month = index + 1; // Months are 1-based
    return {
      month: `${currentYear}-${String(month).padStart(2, "0")}`,
      totalSales: 0, // Default sales value
      monthName: new Date(currentYear, month - 1, 1).toLocaleString("default", { month: "short" }),
    };
  });

  // Merge actual sales data with relevant months
  const formattedMonthlySales = relevantMonths.map((monthData) => {
    const salesData = monthlySales.find(
      (entry) => entry._id.year === currentYear && entry._id.month === parseInt(monthData.month.split("-")[1])
    );
    return {
      ...monthData,
      totalSales: salesData ? salesData.totalSales : 0, // Use actual sales data if available, otherwise 0
    };
  });

  return formattedMonthlySales;
};

// ------------------------------------------------

// Get total sales for a logged-in vendor
exports.getVendorSales = async (req, res) => {
  const { period } = req.query;
  const vendorId = req.user.id; // Assuming the vendor's ID is available in the request (from auth middleware)

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of the week (Sunday)

    const startOfMonth = new Date(today);
    startOfMonth.setDate(1); // Start of the month (1st day)

    const startOfLastSixMonths = new Date(today);
    startOfLastSixMonths.setMonth(startOfLastSixMonths.getMonth() - 6); // Start of the last 6 months

    const startOfYear = new Date(today);
    startOfYear.setMonth(0, 1); // Start of the year (January 1st)

    let totalSales, previousPeriodSales;

    switch (period) {
      case "today":
        totalSales = await calculateVendorSales(today, tomorrow, vendorId);
        previousPeriodSales = await calculateVendorSales(yesterday, today, vendorId);
        break;

      case "thisWeek":
        totalSales = await calculateVendorSales(startOfWeek, tomorrow, vendorId);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        previousPeriodSales = await calculateVendorSales(startOfLastWeek, startOfWeek, vendorId);
        break;

      case "thisMonth":
        totalSales = await calculateVendorSales(startOfMonth, tomorrow, vendorId);
        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        previousPeriodSales = await calculateVendorSales(startOfLastMonth, startOfMonth, vendorId);
        break;

      case "last6Months":
        totalSales = await calculateVendorSales(startOfLastSixMonths, tomorrow, vendorId);
        const startOfPreviousSixMonths = new Date(startOfLastSixMonths);
        startOfPreviousSixMonths.setMonth(startOfPreviousSixMonths.getMonth() - 6);
        previousPeriodSales = await calculateVendorSales(startOfPreviousSixMonths, startOfLastSixMonths, vendorId);
        break;

      case "thisYear":
        totalSales = await calculateVendorSales(startOfYear, tomorrow, vendorId);
        const startOfLastYear = new Date(startOfYear);
        startOfLastYear.setFullYear(startOfLastYear.getFullYear() - 1);
        previousPeriodSales = await calculateVendorSales(startOfLastYear, startOfYear, vendorId);
        break;

      default:
        return res.status(400).json({ error: "Invalid period" });
    }

    // Calculate percentage change
    let percentageChange = 0;
    if (previousPeriodSales > 0) {
      percentageChange =
        ((totalSales - previousPeriodSales) / previousPeriodSales) * 100;
    } else if (totalSales > 0) {
      percentageChange = 100; // If no sales in the previous period but sales in the current period, it's a 100% increase
    }

    res.json({
      totalSales,
      percentageChange,
    });
  } catch (error) {
    console.error("Error fetching vendor sales data:", error);
    res.status(500).json({ error: "Failed to fetch vendor sales data" });
  }
};

// Get total products ordered for a logged-in vendor
exports.getVendorProductsOrdered = async (req, res) => {
  const { period } = req.query;
  const vendorId = req.user.id;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of the week (Sunday)

    const startOfMonth = new Date(today);
    startOfMonth.setDate(1); // Start of the month (1st day)

    const startOfLastSixMonths = new Date(today);
    startOfLastSixMonths.setMonth(startOfLastSixMonths.getMonth() - 6); // Start of the last 6 months

    const startOfYear = new Date(today);
    startOfYear.setMonth(0, 1); // Start of the year (January 1st)

    let totalProducts, previousPeriodProducts;

    switch (period) {
      case "today":
        totalProducts = await calculateVendorProductsOrdered(today, tomorrow, vendorId);
        previousPeriodProducts = await calculateVendorProductsOrdered(yesterday, today, vendorId);
        break;

      case "thisWeek":
        totalProducts = await calculateVendorProductsOrdered(startOfWeek, tomorrow, vendorId);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        previousPeriodProducts = await calculateVendorProductsOrdered(startOfLastWeek, startOfWeek, vendorId);
        break;

      case "thisMonth":
        totalProducts = await calculateVendorProductsOrdered(startOfMonth, tomorrow, vendorId);
        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        previousPeriodProducts = await calculateVendorProductsOrdered(startOfLastMonth, startOfMonth, vendorId);
        break;

      case "last6Months":
        totalProducts = await calculateVendorProductsOrdered(startOfLastSixMonths, tomorrow, vendorId);
        const startOfPreviousSixMonths = new Date(startOfLastSixMonths);
        startOfPreviousSixMonths.setMonth(startOfPreviousSixMonths.getMonth() - 6);
        previousPeriodProducts = await calculateVendorProductsOrdered(startOfPreviousSixMonths, startOfLastSixMonths, vendorId);
        break;

      case "thisYear":
        totalProducts = await calculateVendorProductsOrdered(startOfYear, tomorrow, vendorId);
        const startOfLastYear = new Date(startOfYear);
        startOfLastYear.setFullYear(startOfLastYear.getFullYear() - 1);
        previousPeriodProducts = await calculateVendorProductsOrdered(startOfLastYear, startOfYear, vendorId);
        break;

      default:
        return res.status(400).json({ error: "Invalid period" });
    }

    // Calculate percentage change
    let percentageChange = 0;
    if (previousPeriodProducts > 0) {
      percentageChange =
        ((totalProducts - previousPeriodProducts) / previousPeriodProducts) * 100;
    } else if (totalProducts > 0) {
      percentageChange = 100; // If no products ordered in the previous period but ordered in the current period, it's a 100% increase
    }

    res.json({
      totalProducts,
      percentageChange,
    });
  } catch (error) {
    console.error("Error fetching vendor products ordered data:", error);
    res.status(500).json({ error: "Failed to fetch vendor products ordered data" });
  }
};

// Get pending orders for a logged-in vendor for today, this week, this month, last 6 months, and this year
exports.getVendorPendingOrders = async (req, res) => {
  const { period } = req.query;
  const vendorId = req.user.id; // Assuming the vendor's ID is available in the request (from auth middleware)

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of the week (Sunday)

    const startOfMonth = new Date(today);
    startOfMonth.setDate(1); // Start of the month (1st day)

    const startOfLastSixMonths = new Date(today);
    startOfLastSixMonths.setMonth(startOfLastSixMonths.getMonth() - 6); // Start of the last 6 months

    const startOfYear = new Date(today);
    startOfYear.setMonth(0, 1); // Start of the year (January 1st)

    let pendingOrders, previousPeriodPendingOrders;

    switch (period) {
      case "today":
        pendingOrders = await calculateVendorPendingOrders(today, tomorrow, vendorId);
        previousPeriodPendingOrders = await calculateVendorPendingOrders(yesterday, today, vendorId);
        break;

      case "thisWeek":
        pendingOrders = await calculateVendorPendingOrders(startOfWeek, tomorrow, vendorId);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        previousPeriodPendingOrders = await calculateVendorPendingOrders(startOfLastWeek, startOfWeek, vendorId);
        break;

      case "thisMonth":
        pendingOrders = await calculateVendorPendingOrders(startOfMonth, tomorrow, vendorId);
        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        previousPeriodPendingOrders = await calculateVendorPendingOrders(startOfLastMonth, startOfMonth, vendorId);
        break;

      case "last6Months":
        pendingOrders = await calculateVendorPendingOrders(startOfLastSixMonths, tomorrow, vendorId);
        const startOfPreviousSixMonths = new Date(startOfLastSixMonths);
        startOfPreviousSixMonths.setMonth(startOfPreviousSixMonths.getMonth() - 6);
        previousPeriodPendingOrders = await calculateVendorPendingOrders(startOfPreviousSixMonths, startOfLastSixMonths, vendorId);
        break;

      case "thisYear":
        pendingOrders = await calculateVendorPendingOrders(startOfYear, tomorrow, vendorId);
        const startOfLastYear = new Date(startOfYear);
        startOfLastYear.setFullYear(startOfLastYear.getFullYear() - 1);
        previousPeriodPendingOrders = await calculateVendorPendingOrders(startOfLastYear, startOfYear, vendorId);
        break;

      default:
        return res.status(400).json({ error: "Invalid period" });
    }

    // Calculate percentage change in pending orders
    let percentageChange = 0;
    if (previousPeriodPendingOrders > 0) {
      percentageChange =
        ((pendingOrders - previousPeriodPendingOrders) / previousPeriodPendingOrders) * 100;
    } else if (pendingOrders > 0) {
      percentageChange = 100; // If no pending orders in the previous period but pending orders in the current period, it's a 100% increase
    }

    res.json({
      pendingOrders,
      percentageChange: percentageChange.toFixed(2), // Round to 2 decimal places
    });
  } catch (error) {
    console.error("Error fetching vendor pending orders data:", error);
    res.status(500).json({ error: "Failed to fetch vendor pending orders data" });
  }
};

// Get monthly sales for a logged-in vendor (graph)
exports.vendorPriceGraph = async (req, res) => {
  try {
    const { year } = req.query; // Get year from query parameters
    const vendorId = req.user.id; // Assuming the vendor's ID is available in the request (from auth middleware)

    const monthlySales = await calculateVendorMonthlySales(year, vendorId);
    res.json(monthlySales);
  } catch (error) {
    console.error("Error fetching vendor monthly sales data:", error);
    res.status(500).json({ error: "Failed to fetch vendor monthly sales data" });
  }
};

// Get available years for dropdown (based on logged-in vendor)
exports.getAvailableYears = async (req, res) => {
  try {
    const vendorId = req.user.id; // Assuming the vendor's ID is available in the request (from auth middleware)

    const years = await Order.aggregate([
      {
        $match: { paymentStatus: "Paid" } // Only consider paid orders
      },
      {
        $unwind: "$items" // Unwind the items array to filter by product owner
      },
      {
        $lookup: {
          from: "products", // Join with the Product collection
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $unwind: "$productDetails" // Unwind the productDetails array
      },
      {
        $match: { "productDetails.owner": new mongoose.Types.ObjectId(vendorId) } // Filter by vendor's products
      },
      {
        $group: {
          _id: { $year: "$createdAt" } // Group by year
        }
      },
      {
        $sort: { _id: 1 } // Sort years in ascending order
      }
    ]);

    // Extract and format the years
    const formattedYears = years.map(year => year._id);
    res.json(formattedYears);
  } catch (error) {
    console.error("Error fetching available years for vendor:", error);
    res.status(500).json({ error: "Failed to fetch available years for vendor" });
  }
};