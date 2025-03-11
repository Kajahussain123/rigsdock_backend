const Order = require('../../../models/User/OrderModel');
const User = require('../../../models/User/AuthModel');

// Helper function to calculate total sales for a given period
const calculateSales = async (startDate, endDate) => {
  const orders = await Order.find({
    createdAt: { $gte: startDate, $lt: endDate },
    paymentStatus: "Paid",
  });
  return orders.reduce((total, order) => total + order.totalPrice, 0);
};

// Helper function to calculate total products ordered for a given period
const calculateTotalProductsOrdered = async (startDate, endDate) => {
  const orders = await Order.find({
    createdAt: { $gte: startDate, $lt: endDate },
    paymentStatus: "Paid",
  });

  // Sum up the quantities of all products in all orders
  let totalProducts = 0;
  orders.forEach((order) => {
    order.items.forEach((item) => {
      totalProducts += item.quantity;
    });
  });

  return totalProducts;
};

// Helper function to calculate total registered users for a given period
const calculateTotalRegisteredUsers = async (startDate, endDate) => {
  const users = await User.countDocuments({
    createdAt: { $gte: startDate, $lt: endDate },
  });
  return users;
};

// Helper function to calculate pending orders for a given period
const calculatePendingOrders = async (startDate, endDate) => {
  const totalOrders = await Order.countDocuments({
    createdAt: { $gte: startDate, $lt: endDate },
  });

  const pendingOrders = await Order.countDocuments({
    createdAt: { $gte: startDate, $lt: endDate },
    orderStatus: { $in: ["Processing", "Shipped"] }, // Filter by pending statuses
  });

  return { totalOrders, pendingOrders };
};

const calculateMonthlySales = async (year) => {
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
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        totalSales: { $sum: "$totalPrice" }, // Sum up the total price of orders
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

// -----------------------------------

// Get total sales 
exports.getTotalSales = async (req, res) => {
  const { period } = req.query;

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
        totalSales = await calculateSales(today, tomorrow);
        previousPeriodSales = await calculateSales(yesterday, today);
        break;

      case "thisWeek":
        totalSales = await calculateSales(startOfWeek, tomorrow);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        previousPeriodSales = await calculateSales(startOfLastWeek, startOfWeek);
        break;

      case "thisMonth":
        totalSales = await calculateSales(startOfMonth, tomorrow);
        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        previousPeriodSales = await calculateSales(startOfLastMonth, startOfMonth);
        break;

      case "last6Months":
        totalSales = await calculateSales(startOfLastSixMonths, tomorrow);
        const startOfPreviousSixMonths = new Date(startOfLastSixMonths);
        startOfPreviousSixMonths.setMonth(startOfPreviousSixMonths.getMonth() - 6);
        previousPeriodSales = await calculateSales(startOfPreviousSixMonths, startOfLastSixMonths);
        break;

      case "thisYear":
        totalSales = await calculateSales(startOfYear, tomorrow);
        const startOfLastYear = new Date(startOfYear);
        startOfLastYear.setFullYear(startOfLastYear.getFullYear() - 1);
        previousPeriodSales = await calculateSales(startOfLastYear, startOfYear);
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
    console.error("Error fetching sales data:", error);
    res.status(500).json({ error: "Failed to fetch sales data" });
  }
};

// Get total products ordered
exports.getTotalProductsOrdered = async (req, res) => {
  const { period } = req.query;

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
        totalProducts = await calculateTotalProductsOrdered(today, tomorrow);
        previousPeriodProducts = await calculateTotalProductsOrdered(yesterday, today);
        break;

      case "thisWeek":
        totalProducts = await calculateTotalProductsOrdered(startOfWeek, tomorrow);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        previousPeriodProducts = await calculateTotalProductsOrdered(startOfLastWeek, startOfWeek);
        break;

      case "thisMonth":
        totalProducts = await calculateTotalProductsOrdered(startOfMonth, tomorrow);
        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        previousPeriodProducts = await calculateTotalProductsOrdered(startOfLastMonth, startOfMonth);
        break;

      case "last6Months":
        totalProducts = await calculateTotalProductsOrdered(startOfLastSixMonths, tomorrow);
        const startOfPreviousSixMonths = new Date(startOfLastSixMonths);
        startOfPreviousSixMonths.setMonth(startOfPreviousSixMonths.getMonth() - 6);
        previousPeriodProducts = await calculateTotalProductsOrdered(startOfPreviousSixMonths, startOfLastSixMonths);
        break;

      case "thisYear":
        totalProducts = await calculateTotalProductsOrdered(startOfYear, tomorrow);
        const startOfLastYear = new Date(startOfYear);
        startOfLastYear.setFullYear(startOfLastYear.getFullYear() - 1);
        previousPeriodProducts = await calculateTotalProductsOrdered(startOfLastYear, startOfYear);
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
    console.error("Error fetching total products ordered:", error);
    res.status(500).json({ error: "Failed to fetch total products ordered" });
  }
};

// Get total registered users for today, this week, this month, last 6 months, and this year
exports.getTotalRegisteredUsers = async (req, res) => {
  const { period } = req.query;

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

    let totalUsers, previousPeriodUsers;

    switch (period) {
      case "today":
        totalUsers = await calculateTotalRegisteredUsers(today, tomorrow);
        previousPeriodUsers = await calculateTotalRegisteredUsers(yesterday, today);
        break;

      case "thisWeek":
        totalUsers = await calculateTotalRegisteredUsers(startOfWeek, tomorrow);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        previousPeriodUsers = await calculateTotalRegisteredUsers(startOfLastWeek, startOfWeek);
        break;

      case "thisMonth":
        totalUsers = await calculateTotalRegisteredUsers(startOfMonth, tomorrow);
        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        previousPeriodUsers = await calculateTotalRegisteredUsers(startOfLastMonth, startOfMonth);
        break;

      case "last6Months":
        totalUsers = await calculateTotalRegisteredUsers(startOfLastSixMonths, tomorrow);
        const startOfPreviousSixMonths = new Date(startOfLastSixMonths);
        startOfPreviousSixMonths.setMonth(startOfPreviousSixMonths.getMonth() - 6);
        previousPeriodUsers = await calculateTotalRegisteredUsers(startOfPreviousSixMonths, startOfLastSixMonths);
        break;

      case "thisYear":
        totalUsers = await calculateTotalRegisteredUsers(startOfYear, tomorrow);
        const startOfLastYear = new Date(startOfYear);
        startOfLastYear.setFullYear(startOfLastYear.getFullYear() - 1);
        previousPeriodUsers = await calculateTotalRegisteredUsers(startOfLastYear, startOfYear);
        break;

      default:
        return res.status(400).json({ error: "Invalid period" });
    }

    // Calculate percentage change
    let percentageChange = 0;
    if (previousPeriodUsers > 0) {
      percentageChange = ((totalUsers - previousPeriodUsers) / previousPeriodUsers) * 100;
    } else if (totalUsers > 0) {
      percentageChange = 100; // If no users in the previous period but users in the current period, it's a 100% increase
    }

    res.json({
      totalUsers,
      percentageChange,
    });
  } catch (error) {
    console.error("Error fetching total registered users:", error);
    res.status(500).json({ error: "Failed to fetch total registered users" });
  }
};

// Get pending orders for today, this week, this month, last 6 months, and this year
exports.getPendingOrders = async (req, res) => {
  const { period } = req.query;

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

    let totalOrders, pendingOrders, previousPeriodPendingOrders;

    switch (period) {
      case "today":
        ({ totalOrders, pendingOrders } = await calculatePendingOrders(today, tomorrow));
        ({ pendingOrders: previousPeriodPendingOrders } = await calculatePendingOrders(yesterday, today));
        break;

      case "thisWeek":
        ({ totalOrders, pendingOrders } = await calculatePendingOrders(startOfWeek, tomorrow));
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        ({ pendingOrders: previousPeriodPendingOrders } = await calculatePendingOrders(startOfLastWeek, startOfWeek));
        break;

      case "thisMonth":
        ({ totalOrders, pendingOrders } = await calculatePendingOrders(startOfMonth, tomorrow));
        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        ({ pendingOrders: previousPeriodPendingOrders } = await calculatePendingOrders(startOfLastMonth, startOfMonth));
        break;

      case "last6Months":
        ({ totalOrders, pendingOrders } = await calculatePendingOrders(startOfLastSixMonths, tomorrow));
        const startOfPreviousSixMonths = new Date(startOfLastSixMonths);
        startOfPreviousSixMonths.setMonth(startOfPreviousSixMonths.getMonth() - 6);
        ({ pendingOrders: previousPeriodPendingOrders } = await calculatePendingOrders(startOfPreviousSixMonths, startOfLastSixMonths));
        break;

      case "thisYear":
        ({ totalOrders, pendingOrders } = await calculatePendingOrders(startOfYear, tomorrow));
        const startOfLastYear = new Date(startOfYear);
        startOfLastYear.setFullYear(startOfLastYear.getFullYear() - 1);
        ({ pendingOrders: previousPeriodPendingOrders } = await calculatePendingOrders(startOfLastYear, startOfYear));
        break;

      default:
        return res.status(400).json({ error: "Invalid period" });
    }

    // Calculate percentage of pending orders
    const pendingPercentage = totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0;

    // Calculate percentage change in pending orders
    let percentageChange = 0;
    if (previousPeriodPendingOrders > 0) {
      percentageChange =
        ((pendingOrders - previousPeriodPendingOrders) / previousPeriodPendingOrders) * 100;
    } else if (pendingOrders > 0) {
      percentageChange = 100; // If no pending orders in the previous period but pending orders in the current period, it's a 100% increase
    }

    res.json({
      totalOrders,
      pendingOrders,
      pendingPercentage: pendingPercentage.toFixed(2), // Round to 2 decimal places
      percentageChange: percentageChange.toFixed(2), // Round to 2 decimal places
    });
  } catch (error) {
    console.error("Error fetching pending orders data:", error);
    res.status(500).json({ error: "Failed to fetch pending orders data" });
  }
};

// graph
exports.priceGraph = async(req, res) => {
  try {
      const { year } = req.query; // Get year from query parameters
      const monthlySales = await calculateMonthlySales(year);
      res.json(monthlySales);
  } catch (error) {
      console.error("Error fetching monthly sales data:", error);
      res.status(500).json({ error: "Failed to fetch monthly sales data" });
  }
};

// get available years for dropdown
exports.getAvailableYears = async (req, res) => {
  try {
    const years = await Order.aggregate([
      {
        $match: { paymentStatus: "Paid" }
      },
      {
        $group: {
          _id: { $year: "$createdAt" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    const formattedYears = years.map(year => year._id);
    res.json(formattedYears);
  } catch (error) {
    console.error("Error fetching available years:", error);
    res.status(500).json({ error: "Failed to fetch available years" });
  }
};