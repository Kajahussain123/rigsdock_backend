require("dotenv").config();
const express = require("express");
const cors = require("cors");
require("./config/db");
const path = require("path");
const app = express();
app.use(cors({
origin: [
    'http://localhost:3000', 
    'https://rigsdock.com',
    'https://www.rigsdock.com',
    'https://vermillion-beijinho-abb79a.netlify.app',
  ],
  methods: ['GET','HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const socketIo = require('socket.io');
const http = require('http');
app.options("*", cors());  // Allow preflight requests
app.use((req, res, next) => {
  if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
    return next();  // Skip JSON parsing for file uploads
  }
  next();
});
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Adjust this as needed
    methods: ["GET", "POST"],
  },
});

const cron = require("node-cron")
const Offer = require("./models/admin/OfferModel");
const Product = require("./models/admin/ProductModel")
const DealOfTheDay = require("./models/Vendor/DealofthedayModel");
const socketHandler = require('./utils/socketHandler');


// Token Refresh Route
const tokenRefresh = require("./routes/token/refreshToken");

// Admin Routes
const adminAuth = require("./routes/admin/authRoute");
const adminHomeOffer = require("./routes/admin/HomeOffer/homeOfferRoutes");
const adminBrand = require("./routes/admin/Brand/brandRoute");
const SubcategoryRoutes = require("./routes/admin/SubCategory/SubCategoryRoute");
const blogRoutes = require("./routes/admin/Blog/blogRoute");
const ProductRoutes = require("./routes/admin/Product/ProductRoute");
const CategoryRoutes = require("./routes/admin/categoryRoute");
const MainCategoryRouter = require("./routes/admin/MainCategory/mainCategoryRoute");
const NotificationRouter = require("./routes/admin/Notification/notificationRoute");
const carouselRouter = require("./routes/admin/Carousel/carouselRoute");
const adminVendorRoute = require("./routes/admin/Vendor/VendorRoute");
const OfferRouter = require('./routes/admin/Offer/offerRoutes');
const couponRouter = require('./routes/admin/Coupon/couponRoutes')
const DealRouter = require('./routes/admin/Deal/dealRoutes')
const adminOrder = require('./routes/admin/Order/orderRoutes');
const adminInvoice = require('./routes/admin/Invoice/invoiceRoutes');
const adminUser = require('./routes/admin/User/UserRoutes');
const adminDashboard = require('./routes/admin/Dashboard/DashboardRoute');
const adminFinancial = require('./routes/admin/Financial/FinancialRoutes');
const adminVendorpayout = require('./routes/admin/vendorPayout/vendorPayoutRoutes');
const adminAnalytics = require('./routes/admin/Analytics/analyticsRoutes');
const adminReviews = require('./routes/admin/Review/ReviewRoute');
const adminChat = require('./routes/admin/Chat/chatRoute');
const adminShiprocket = require('./routes/admin/Shiprocket/adminShiprocketRoute');


// Vendor Routes
const vendorAuth = require("./routes/Vendor/Auth/AuthRoute");
const vendorMaincategory = require('./routes/Vendor/MainCategory/MaincategoryRoute');
const vendorCategory = require('./routes/Vendor/Category/CategoryRoutes');
const vendorSubcategory = require('./routes/Vendor/SubCategory/SubCategoryRoutes');
const vendorProfile = require('./routes/Vendor/Profile/ProfileRoutes');
const vendorNotification = require('./routes/Vendor/Notification/NotificationRoute');
const vendorProduct = require('./routes/Vendor/Product/VendorProductRoutes');
const vendorCarousel = require('./routes/Vendor/Carousel/CarouselRoutes');
const vendorOffer = require('./routes/Vendor/Offer/offerRoutes');
const vendorCoupon = require('./routes/Vendor/Coupon/CouponRoutes');
const vendorDealOfTheDay = require('./routes/Vendor/DealOfTheDay/DealOfTheDayRoutes');
const vendorDashboard = require('./routes/Vendor/Dashboard/DashboardRoutes');
const vendorOrder = require('./routes/Vendor/Order/VendorOrderRoutes');
const vendorAnalytics = require('./routes/Vendor/Analytics/analyticsRoutes');
const vendorReview = require('./routes/Vendor/Review/reviewRoutes');
const vendorInsights = require('./routes/Vendor/Insights/insightsRoute');
const vendorChat = require('./routes/Vendor/Chat/vendorChatRoute');
const vendorShiprocket = require('./routes/Vendor/Shiprocket/vendorShiprocketRoute');



// User Routes
const userAuth = require("./routes/User/authRoutes");
const userBrand = require("./routes/User/brandRoute")
const userBlogRoutes = require("./routes/User/blogRoutes")
const userHomeOfferRoutes = require("./routes/User/homeOfferRoutes")
const userMainCategoryRoutes = require("./routes/User/mainCategoryRoutes");
const userCategoryRoutes = require("./routes/User/categoryRoutes");
const userSubCategoryRoutes = require("./routes/User/subCategoryRoutes");
const userProductRoutes = require("./routes/User/productRoutes");
const wishlistRoutes = require("./routes/User/wishlistRoutes");
const cartRoutes = require("./routes/User/cartRoutes");
const addressRoutes = require("./routes/User/addressRoutes");
const checkoutRoutes = require("./routes/User/checkoutRoutes");
const orderRoutes= require('./routes/User/OrderRoutes')
const userReviewsRoutes = require('./routes/User/ReviewsRoutes')
const complaintsRoutes = require('./routes/User/ComplaintRoutes')
const dealofthedayUserRoutes= require('./routes/User/dealOfTheDayRoutes')
const vendorUserRoutes=require('./routes/User/vendorRoutes')
const platFormFee = require('./routes/admin/PlatformFee/PlatformFeeRoutes')
const userShiprocket = require('./routes/User/ShiprocketRoutes');

// Token Refresh
app.use("/token", tokenRefresh);


// Admin Routes
app.use("/api/admin/auth", adminAuth);
app.use("/api/admin/brand", adminBrand);
app.use("/api/admin/homeoffer", adminHomeOffer);
app.use("/api/admin/blog", blogRoutes);
app.use("/api/admin/subcategory", SubcategoryRoutes);
app.use("/api/admin/product", ProductRoutes);
app.use("/api/admin/category", CategoryRoutes);
app.use("/api/admin/maincategory", MainCategoryRouter);
app.use("/api/admin/notification", NotificationRouter);
app.use("/api/admin/carousel", carouselRouter);
app.use("/api/admin/vendor", adminVendorRoute);
app.use('/api/admin/offer', OfferRouter);
app.use('/api/admin/coupon', couponRouter);
app.use('/api/admin/deal', DealRouter);
app.use('/api/admin/order', adminOrder);
app.use('/api/admin/invoice', adminInvoice);
app.use('/api/admin/user', adminUser);
app.use('/api/admin/platform', platFormFee);  // ✅ Added from 'kaja' branch
app.use('/api/admin/dashboard', adminDashboard);
app.use('/api/admin/financial', adminFinancial);
app.use('/api/admin/vendorpayout', adminVendorpayout);
app.use('/api/admin/analytics', adminAnalytics);
app.use('/api/admin/review', adminReviews);
app.use('/api/admin/chat',adminChat)
app.use('/api/admin/shiprocket',adminShiprocket)



// Vendor Routes
app.use("/api/vendor/auth", vendorAuth);
app.use("/api/vendor/maincategory", vendorMaincategory);
app.use("/api/vendor/category", vendorCategory);
app.use("/api/vendor/subcategory", vendorSubcategory);
app.use("/api/vendor/profile", vendorProfile);
app.use("/api/vendor/notification", vendorNotification);
app.use("/api/vendor/product", vendorProduct);
app.use("/api/vendor/carousel", vendorCarousel);
app.use("/api/vendor/offer", vendorOffer);
app.use("/api/vendor/coupon", vendorCoupon);
app.use("/api/vendor/dealoftheday", vendorDealOfTheDay);
app.use("/api/vendor/dashboard", vendorDashboard);
app.use("/api/vendor/order", vendorOrder);
app.use("/api/vendor/analytics", vendorAnalytics);
app.use("/api/vendor/review", vendorReview);
app.use("/api/vendor/insights", vendorInsights);
app.use("/api/vendor/chat", vendorChat);
app.use("/api/vendor/shiprocket", vendorShiprocket);


// User Routes
app.use("/api/user/auth", userAuth);
app.use("/api/user/brand", userBrand)
app.use("/api/user/blog", userBlogRoutes);
app.use("/api/user/homeoffer", userHomeOfferRoutes)
app.use("/api/user/maincategory", userMainCategoryRoutes);
app.use("/api/user/category", userCategoryRoutes);
app.use("/api/user/subcategory", userSubCategoryRoutes);
app.use("/api/user/product", userProductRoutes);
app.use("/api/user/wishlist", wishlistRoutes);
app.use("/api/user/cart", cartRoutes);
app.use("/api/user/address", addressRoutes);
app.use("/api/user/checkout", checkoutRoutes);
app.use("/api/user/order",orderRoutes)
app.use("/api/user/reviews",userReviewsRoutes)
app.use("/api/user/complaint",complaintsRoutes)
app.use("/api/user/dealoftheday",dealofthedayUserRoutes)
app.use("/api/user/vendor",vendorUserRoutes)
app.use("/api/user/shiprocket",userShiprocket);


// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// This function will check offers every day at midnight
cron.schedule("0 0 * * *", async () => {
    console.log("Running daily offer expiry check...");
    const now = new Date();
    
    // Find offers that are expired or inactive
    const expiredOffers = await Offer.find({
      $or: [
        { validTo: { $lt: now } },
        { status: { $ne: "active" } }
      ]
    });
    
    for (const offer of expiredOffers) {
      if (offer.targetType === "Product") {
        const productIds = Array.isArray(offer.target) ? offer.target : [offer.target];
        const products = await Product.find({ _id: { $in: productIds }, offer: offer._id });
        for (let product of products) {
          product.finalPrice = product.price;
          product.offer = null;
          await product.save();
        }
      } else if (offer.targetType === "Category") {
        const products = await Product.find({ category: offer.target, offer: offer._id });
        for (let product of products) {
          product.finalPrice = product.price;
          product.offer = null;
          await product.save();
        }
      }
      console.log(`Reverted offer ${offer._id} as it is expired or inactive`);
    }
  });

// New cron job for "Deal of the Day" concept
cron.schedule("0 * * * *", async () => {
  try {
    const currentTime = new Date();

    // Find expired deals
    const expiredDeals = await DealOfTheDay.find({ expiresAt: { $lte: currentTime } });

    // Revert the finalPrice for each expired deal
    for (const deal of expiredDeals) {
      const product = await Product.findById(deal.product);
      if (product) {
        product.finalPrice = product.price; // Revert to original price
        await product.save();
      }
      // Update the deal status to "inactive"
      deal.status = "inactive";
      await deal.save();
    }

    // // Delete expired deals
    // await DealOfTheDay.deleteMany({ expiresAt: { $lte: currentTime } });

    console.log("Expired deals cleaned up successfully");
  } catch (error) {
    console.error("Error cleaning up expired deals:", error);
  }
});

socketHandler(io);

const PORT = process.env.PORT || 3006;

server.listen(PORT, () => {
    console.log(`Server started listening at PORT ${PORT}`);
});
 