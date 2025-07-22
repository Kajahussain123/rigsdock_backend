const Vendor = require('../../../models/Vendor/vendorModel');
const fs = require('fs');
const path = require('path');
const Order = require('../../../models/User/OrderModel')
const PlatformFee = require('../../../models/admin/PlatformFeeModel');
const cron = require('node-cron')

const moment = require("moment");

//create new vendor
exports.createVendor = async (req, res) => {
    try {
        const existingVendorMail = await Vendor.findOne({ email: req.body.email });
        if (existingVendorMail) {
            return res.status(409).json({ message: 'Vendor email already exists' });
        }

        const existingVendorPhone = await Vendor.findOne({ number: req.body.number });
        if (existingVendorPhone) {
            return res.status(409).json({ message: 'Vendor phone number already exists' });
        }

        const images = req.files.images;
        const storeLogo = req.files.storelogo?.[0];
        const license = req.files.license?.[0];
        const passbookPhoto = req.files.passbookPhoto?.[0];

        if (!storeLogo) return res.status(422).json({ message: "Store logo is required" });
        if (!license) return res.status(422).json({ message: "License is required" });
        if (!passbookPhoto) return res.status(422).json({ message: "Passbook photo is required" });
        if (!images || images.length === 0) return res.status(422).json({ message: "At least one vendor image is required" });

        const imagePaths = images.map(file => file.filename);

        const newVendor = new Vendor({
            ...req.body,
            storelogo: storeLogo.filename,
            license: license.filename,
            passbookPhoto: passbookPhoto.filename,
            images: imagePaths
        });

        await newVendor.save();
        res.status(201).json({ message: "Vendor created successfully", vendor: newVendor });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

exports.getVendorMonthlyReport = async (req, res) => {
  const { month, vendorId } = req.query;

  if (!month) {
    return res
      .status(400)
      .json({ message: "Please provide a month in YYYY-MM format" });
  }

  const [year, monthIndex] = month.split("-");
  const startDate = new Date(`${year}-${monthIndex}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  try {
    // Build query
    const query = {
      createdAt: { $gte: startDate, $lt: endDate },
    };

    if (vendorId) {
      query.vendor = vendorId;
    }

    const orders = await Order.find(query)
      .populate("user")
      .populate("shippingAddress") // <-- Add this line to populate the full address
      .populate({
        path: "items.product",
        populate: [
          { path: "owner", model: "Vendor" },
          { path: "category", model: "Category" },
        ],
      });

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No orders found for the given criteria" });
    }

    const platformFeeData = await PlatformFee.findOne().sort({ createdAt: -1 });
    const platformFee = platformFeeData?.amount || 0;

    const ordersWithStats = orders.map((order) => {
      const itemsWithCommission = order.items.map((item) => {
        const commissionPercentage =
          item.product?.category?.commissionPercentage || 0;
        const commissionAmount = (item.price * commissionPercentage) / 100;
        const vendorAmount = item.price - commissionAmount;

        return {
          ...item.toObject(),
          commissionPercentage,
          commissionAmount,
          vendorAmount,
        };
      });

      const totalCommission = itemsWithCommission.reduce(
        (sum, i) => sum + i.commissionAmount,
        0
      );
      const totalVendorAmount = itemsWithCommission.reduce(
        (sum, i) => sum + i.vendorAmount,
        0
      );

      return {
        ...order.toObject(),
        platformFee,
        totalCommission,
        totalVendorAmount,
        items: itemsWithCommission,
      };
    });

    const responseData = {
      message: "Monthly vendor report generated",
      totalOrders: orders.length,
      report: ordersWithStats,
    };

    res.status(200).json(responseData);

    // Return the data if the function is called programmatically
    return responseData;
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error generating report", error: error.message });
    throw error;
  }
};

const generateVendorExcelReport = async (
  vendorData,
  month,
  vendorEmail,
  vendorName
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Monthly Report");

  // Format the month for display (YYYY-MM to Month YYYY)
  const [year, monthNum] = month.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const displayMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

  // Add header with styling
  worksheet.mergeCells("A1:H1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `Monthly Sales Report for ${vendorName} - ${displayMonth}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center" };

  // Add header row
  worksheet.addRow([
    "Order ID",
    "Customer",
    "Address",
    "Product",
    "Quantity",
    "Discount (₹)",
    "Final Price (₹)",
    "Commission (₹)",
    "Net Amount (₹)",
    "Order Status",
  ]);

  // Style the header row (2nd row because title might be above)
  worksheet.getRow(2).font = { bold: true };
  worksheet.getRow(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  let totalSales = 0;
  let totalCommission = 0;
  let totalNetAmount = 0;

  vendorData.report.forEach((order) => {
    order.items.forEach((item) => {
      const price = Number(item.product?.price || 0);
      const finalPrice = Number(
        item.finalPrice ??
          item.product?.finalPrice ??
          item.offer?.finalPrice ??
          price
      );
      const discount = price > finalPrice ? price - finalPrice : 0;

      // Build a single-line full address
      const addressParts = [
        order.shippingAddress?.addressLine1,
        order.shippingAddress?.addressLine2,
        order.shippingAddress?.city,
        order.shippingAddress?.state,
        order.shippingAddress?.zipCode,
      ];
      const fullAddress = addressParts.filter(Boolean).join(", ") || "N/A";

      // Customer full name
      const customerName =
        `${order.shippingAddress?.firstName || ""} ${
          order.shippingAddress?.lastName || ""
        }`.trim() || "N/A";

      worksheet.addRow([
        order._id || "N/A",
        customerName,
        fullAddress,
        item.product?.name || "Unnamed Product",
        item.quantity || 0,
        discount,
        finalPrice,
        item.commissionAmount || 0,
        item.vendorAmount || 0,
        order.orderStatus || "Unknown",
      ]);

      totalSales += finalPrice;
      totalCommission += item.commissionAmount || 0;
      totalNetAmount += item.vendorAmount || 0;
    });
  });

  // Add summary section
  worksheet.addRow([]);
  const summaryRow = worksheet.addRow(["Summary", "", "", "", "", "", "", ""]);
  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F2F2" },
  };

  worksheet.addRow([
    "Total Orders",
    vendorData.totalOrders,
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  worksheet.addRow(["Total Sales (₹)", totalSales, "", "", "", "", "", ""]);
  worksheet.addRow([
    "Total Commission (₹)",
    totalCommission,
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  worksheet.addRow([
    "Total Net Amount (₹)",
    totalNetAmount,
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  // Platform fee info
  if (vendorData.report[0]?.platformFee) {
    worksheet.addRow([
      "Platform Fee (₹)",
      vendorData.report[0].platformFee,
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  }

  // Set column widths
  worksheet.columns.forEach((column, index) => {
    if (index === 2) {
      // Product name column
      column.width = 40;
    } else {
      column.width = 20;
    }
  });

  // Format number columns
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      // Skip header rows
      // Format price columns (5, 6, 7)
      [5, 6, 7].forEach((colIndex) => {
        const cell = row.getCell(colIndex);
        if (typeof cell.value === "number") {
          cell.numFmt = "₹#,##0.00";
        }
      });
    }
  });

  // Create the reports directory if it doesn't exist
  const reportsDir = path.join(__dirname, "../reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const safeVendorName = vendorName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const fileName = `${reportsDir}/${safeVendorName}_report_${month}.xlsx`;

  // Save the workbook
  await workbook.xlsx.writeFile(fileName);
  return fileName;
};

// Configure email transporter
const configureMailTransporter = () => {
  console.log(
    "Attempting to configure email with user:",
    process.env.EMAIL_USER
  );
  // Don't log the full password, just confirm it exists
  console.log("Password available:", process.env.EMAIL_PASS ? "Yes" : "No");
  // Add this near the start of your application
  console.log("Email environment variables loaded:", {
    EMAIL_USER: process.env.EMAIL_USER ? "✅" : "❌",
    EMAIL_PASS: process.env.EMAIL_PASS ? "✅" : "❌",
    // Don't log the actual values for security reasons
  });
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    debug: true,
  });
};
// Function to send email with Excel attachment
const sendReportByEmail = async (filePath, vendorEmail, vendorName, month) => {
  try {
    const transporter = configureMailTransporter();

    // Format the month for display (YYYY-MM to Month YYYY)
    const [year, monthNum] = month.split("-");
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const displayMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

    const mailOptions = {
      from: `"Rigsdock E-Commerce Platform" <${process.env.EMAIL_USER}>`,
      to: vendorEmail,
      subject: `Monthly Sales Report - ${displayMonth}`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                        <h2 style="color: #333;">Monthly Sales Report</h2>
                        <p style="font-size: 18px;">${displayMonth}</p>
                    </div>
                    <div style="padding: 20px;">
                        <p>Dear ${vendorName},</p>
                        <p>Please find   your monthly sales report for ${displayMonth}.</p>
                        <p>This report includes all orders processed during this period, along with commission calculations and your net earnings.</p>
                        <p>Thank you for your continued partnership.</p>
                        <p>Best regards,<br>Rigsdock E-Commerce Platform Team</p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            `,
      attachments: [
        {
          filename: `${vendorName}_Monthly_Report_${displayMonth}.xlsx`,
          path: filePath,
        },
      ],
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email sending error:", error);
    if (
      error.message.includes("invalid_grant") ||
      error.message.includes("Invalid login")
    ) {
      console.error("Authentication error - check your email credentials");
    }
    throw error;
  }
};

// Controller to generate and send report for a specific vendor
exports.generateAndSendVendorReport = async (req, res) => {
  try {
    const { month, vendorId } = req.query;

    if (!month || !vendorId) {
      return res
        .status(400)
        .json({ message: "Please provide month and vendorId" });
    }

    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Create a proper mock response object
    let reportData;
    const mockRes = {
      status: () => mockRes,
      json: (data) => {
        reportData = data;
        return mockRes;
      },
    };

    // Get report data
    await exports.getVendorMonthlyReport(
      { query: { month, vendorId } },
      mockRes
    );

    if (!reportData || !reportData.totalOrders) {
      return res.status(404).json({
        message: "No orders found for this vendor in the specified month",
      });
    }

    // Generate Excel report
    const vendorName = vendor.businessname || vendor.ownername;
    const excelFilePath = await generateVendorExcelReport(
      reportData,
      month,
      vendor.email,
      vendorName
    );

    // Send email with report
    await sendReportByEmail(excelFilePath, vendor.email, vendorName, month);

    // Delete file after sending (optional)
    fs.unlinkSync(excelFilePath);

    res.status(200).json({
      message: "Report generated and sent successfully",
      vendor: vendorName,
      email: vendor.email,
      month: month,
    });
  } catch (error) {
    console.error("Error generating and sending report:", error);
    res.status(500).json({
      message: "Error generating and sending report",
      error: error.message,
    });
  }
};

// Controller to generate and send reports for all vendors
exports.sendMonthlyReportsToAllVendors = async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM

    if (!month) {
      return res
        .status(400)
        .json({ message: "Please provide a month in YYYY-MM format" });
    }

    // Get all active vendors
    const vendors = await Vendor.find({ status: "approved" });

    if (!vendors.length) {
      return res.status(404).json({ message: "No active vendors found" });
    }

    const results = [];

    // Process each vendor
    for (const vendor of vendors) {
      try {
        // Create a proper mock response object for each vendor
        let reportData;
        const mockRes = {
          status: () => mockRes,
          json: (data) => {
            reportData = data;
            return mockRes;
          },
        };

        // Get vendor's report data
        await exports.getVendorMonthlyReport(
          { query: { month, vendorId: vendor._id } },
          mockRes
        );

        // If there are orders for this vendor
        if (reportData && reportData.totalOrders > 0) {
          // Generate Excel report
          const vendorName = vendor.businessname || vendor.ownername;
          const excelFilePath = await generateVendorExcelReport(
            reportData,
            month,
            vendor.email,
            vendorName
          );

          // Send email with report
          await sendReportByEmail(
            excelFilePath,
            vendor.email,
            vendorName,
            month
          );

          results.push({
            vendorId: vendor._id,
            vendorName: vendorName,
            email: vendor.email,
            status: "success",
            message: "Report generated and sent successfully",
            ordersProcessed: reportData.totalOrders,
          });

          // Delete file after sending
          fs.unlinkSync(excelFilePath);
        } else {
          results.push({
            vendorId: vendor._id,
            vendorName: vendor.businessname || vendor.ownername,
            email: vendor.email,
            status: "skipped",
            message: "No orders found for this period",
          });
        }
      } catch (vendorError) {
        results.push({
          vendorId: vendor._id,
          vendorName: vendor.businessname || vendor.ownername,
          email: vendor.email,
          status: "error",
          message: vendorError.message,
        });
      }
    }

    res.status(200).json({
      message: "Monthly reports processed successfully",
      month: month,
      totalVendors: vendors.length,
      results,
    });
  } catch (error) {
    console.error("Error processing monthly reports:", error);
    res.status(500).json({
      message: "Error processing reports",
      error: error.message,
    });
  }
};

const setupReportScheduler = () => {
  // Run on the first day of each month at midnight
  cron.schedule("0 0 1 * *", async () => {
    try {
      console.log("Running scheduled monthly report generation...");

      // Use previous month for production reports
      const now = new Date();
      now.setMonth(now.getMonth() - 1); // Get previous month
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const reportMonth = `${year}-${month}`;

      console.log(`Generating reports for month: ${reportMonth}`);

      // Get all active vendors
      const vendors = await Vendor.find({ status: "approved" });
      console.log(`Found ${vendors.length} active vendors`);

      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const vendor of vendors) {
        try {
          // Create a proper mock response object for each vendor
          let reportData;
          const mockRes = {
            status: () => mockRes,
            json: (data) => {
              reportData = data;
              return mockRes;
            },
          };

          // Get vendor's report data
          await exports.getVendorMonthlyReport(
            { query: { month: reportMonth, vendorId: vendor._id } },
            mockRes
          );

          // Only generate and send if there's data
          if (reportData && reportData.totalOrders > 0) {
            // Generate Excel report
            const vendorName = vendor.businessname || vendor.ownername;
            const excelFilePath = await generateVendorExcelReport(
              reportData,
              reportMonth,
              vendor.email,
              vendorName
            );

            // Send email with report
            await sendReportByEmail(
              excelFilePath,
              vendor.email,
              vendorName,
              reportMonth
            );

            console.log(
              `Monthly report sent to ${vendor.email} (${vendorName})`
            );
            successCount++;

            // Delete file after sending
            fs.unlinkSync(excelFilePath);
          } else {
            console.log(
              `No orders for vendor ${vendor.email} (${
                vendor.businessname || vendor.ownername
              }) in ${reportMonth}`
            );
            skippedCount++;
          }
        } catch (vendorError) {
          console.error(
            `Error processing report for vendor ${vendor._id}:`,
            vendorError
          );
          errorCount++;
        }
      }

      console.log(
        `Monthly report generation completed. Success: ${successCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
      );
    } catch (error) {
      console.error("Error in scheduled report generation:", error);
    }
  });

  console.log("Monthly report scheduler initialized");
};
setupReportScheduler();



//get all vendors
exports.getAllVendors = async(req,res) => {
    try {
        const vendors = await Vendor.find();
        if(vendors.length === 0 ){
            return res.status(400).json({ message: 'No vendors' });
        }
        res.status(200).json({
            total: vendors.length,
            vendors
        });
    } catch (error) {
        res.status(500).json({message: 'Error fetching vendors', error:error.message})
    }
}

// get vendor by id
exports.getVendorById = async (req, res) => {
    const { id } = req.params;

    try {
        const vendor = await Vendor.findById(id);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        // Fetch orders that have items owned by this vendor
        const orders = await Order.find()
            .populate('user')
            .populate({
                path: 'items.product',
                populate: [
                    { path: 'owner', model: 'Vendor' },
                    { path: 'category', model: 'Category' }
                ]
            });

        // Filter orders that include items from this vendor with proper null checks
        const vendorOrders = orders.filter(order =>
            order.items.some(item => 
                item.product && 
                item.product.owner && 
                item.product.owner._id.toString() === id
            )
        );

        let totalSettledAmount = 0;
        let totalBalance = 0;
        let transactionHistory = [];

        for (const order of vendorOrders) {
            const vendorItems = order.items.filter(item => 
                item.product && 
                item.product.owner && 
                item.product.owner._id.toString() === id
            );

            let vendorAmount = 0;
            let commission = 0;

            const detailedItems = vendorItems.map(item => {
                // Add null checks for product and category
                const commissionPercentage = (item.product && item.product.category && item.product.category.commissionPercentage) || 0;
                const commissionAmount = (item.price * commissionPercentage) / 100;
                const vendorNet = item.price - commissionAmount;

                vendorAmount += vendorNet;
                commission += commissionAmount;

                return {
                    productName: item.product ? item.product.name : 'Unknown Product',
                    price: item.price,
                    commissionPercentage,
                    commissionAmount,
                    vendorAmount: vendorNet
                };
            });

            if (order.settled) {
                totalSettledAmount += vendorAmount;
            } else {
                totalBalance += vendorAmount;
            }

            transactionHistory.push({
                orderId: order._id,
                settled: order.settled,
                createdAt: order.createdAt,
                items: detailedItems,
                totalVendorAmount: vendorAmount,
                totalCommission: commission
            });
        }

        res.status(200).json({
            vendor,
            totalOrders: vendorOrders.length,
            totalSettledAmount,
            totalBalance,
            transactionHistory
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vendor details', error: error.message });
    }
};


// update vendor
exports.updateVendor = async (req, res) => {
    const { id } = req.params;
    try {
        const vendor = await Vendor.findById(id);
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        const images = req.files.images || [];
        const existingImages = vendor.images;
        const newImages = images.map(file => file.filename);

        if (existingImages.length + newImages.length > 5) {
            return res.status(400).json({ message: "Cannot have more than 5 images for a vendor" });
        }

        if (req.files.storelogo?.[0]) {
            const oldPath = path.join(__dirname, "../uploads/admin/vendor", vendor.storelogo);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            vendor.storelogo = req.files.storelogo[0].filename;
        }

        if (req.files.license?.[0]) {
            const oldPath = path.join("./uploads", vendor.license);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            vendor.license = req.files.license[0].filename;
        }

        if (req.files.passbookPhoto?.[0]) {
            const oldPath = path.join("./uploads", vendor.passbookPhoto);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            vendor.passbookPhoto = req.files.passbookPhoto[0].filename;
        }

        const updatedVendorData = {
            ...req.body,
            images: [...existingImages, ...newImages],
            storelogo: vendor.storelogo,
            license: vendor.license,
            passbookPhoto: vendor.passbookPhoto
        };

        const updatedVendor = await Vendor.findByIdAndUpdate(id, updatedVendorData, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ message: "Vendor updated successfully", updatedVendor });
    } catch (error) {
        res.status(500).json({ message: 'Error updating vendor', error: error.message });
    }
};

//delete Vendor
exports.deleteVendor = async(req,res) => {
    const { id } = req.params;
    try {
        const vendor = await Vendor.findById(id);
        if(!vendor){
            return res.status(404).json({ message: 'vendor not found' })
        }
        // Delete associated images
        const basePath = path.join('./uploads');
        const imagePaths = vendor.images.map((image) => path.join(basePath, image));

        imagePaths.forEach((imagePath) => {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath); // Delete each image file
            }  
        });
        const storelogoPath = path.join(basePath, vendor.storelogo);
        if(fs.existsSync(storelogoPath)){
            fs.unlinkSync(storelogoPath);
        }
        const licensePath = path.join(basePath, vendor.license);
        if(fs.existsSync(licensePath)){
            fs.unlinkSync(licensePath);
        }
        await Vendor.findByIdAndDelete(id);
        res.status(200).json({ message: 'vendor deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting vendor', error: error.message });
    }
}

// delete a specific image by name
exports.deleteVendorImage = async (req,res) =>{
    try {
        const { id } = req.params;
        const { imageName } = req.body;
        const vendor = await Vendor.findById(id);
        if(!vendor){
            return res.status(404).json({ message: "vendor not found" });
        }
        const imgExists = vendor.images.filter((img) => {
            const imgFileName = img.split("\\").pop().split("/").pop();
            return imgFileName === imageName;
        })
        if(!imgExists){
            return res.status(400).json({ message: "Image not found in vendor" });
        }
         // Use $pull to remove the image directly in the database
        const updatedVendor = await Vendor.findByIdAndUpdate(
        id,
        { $pull: { images: { $regex: new RegExp(imageName, "i") } } },
        { new: true });
        res.status(200).json({ message: "Image deleted successfully", images: updatedVendor.images });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// search vendor by name
exports.searchVendors = async (req, res) => {
    const { ownername,city } = req.query;
    try {
        const query = {};
        if(ownername) {
            query.ownername = { $regex: ownername, $options: 'i' }; 
        }
        if(city){
            query.city = { $regex: city, $options: 'i' };
        }
        const vendors = await Vendor.find(query);
        res.status(200).json(vendors);
    } catch (err) {
        res.status(500).json({ message: 'Error searching vendors', error: err.message });
    }
};

// get all pending requests
exports.getPendingVendors = async (req,res) => {
    try {
        const pendingVendors = await Vendor.find({ status: "pending" }).select('-password');
        if (pendingVendors.length === 0) {
            return res.status(404).json({ message: "No Pending Vendors" });
        }
        res.status(200).json({ message: "Pending vendors fetched successfully", vendors: pendingVendors });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// handle vendor request
exports.handleVendorReq = async (req,res) => {
    try {
        const {status} = req.body;
        const {vendorId} = req.params;

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        vendor.status = status;
        await vendor.save();

        res.status(200).json({ message: `Vendor request ${status} successfully`, vendor });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// get all pending vendor profile update requests
exports.getUpdateProfilePendingVendors = async (req,res) => {
    try {
        const pendingVendors = await Vendor.find({ updateProfile: "pending" }).select('-password');
        if (pendingVendors.length === 0) {
            return res.status(404).json({ message: "No Pending Vendors" });
        }
        res.status(200).json({ message: "Pending vendors fetched successfully", vendors: pendingVendors });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// handle vendor update req
exports.handleVendorUpdateReq = async(req,res) => {
    try {
        const { status } = req.body;
        const {vendorId} = req.params;

        const vendor = await Vendor.findById(vendorId);

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'." });
        }

        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        if(vendor.updateProfile !== "pending"){
            return res.status(400).json({ message: "No pending update request for this vendor" });
        }
        if(status === "approved"){
            // Apply the pending updates to the vendor's profile
            for(const[key,value] of vendor.pendingUpdates) {
                vendor[key] = value;
            }

            // Clear the pendingUpdates field and set updateProfile to approved
            vendor.pendingUpdates = new Map();  // Clear the Map
            vendor.updateProfile = "approved";
        }
        if(status === "rejected"){
            vendor.pendingUpdates = new Map();  // Clear the Map
            vendor.updateProfile = "rejected"
        }
        await vendor.save();
        res.status(200).json({ message: "Update approved and applied", vendor });
    } catch (error) {
        console.error("Error handling vendor update request:", error);
        res.status(500).json({ message: "Internal server error." });
    }
}