require("dotenv").config();
const express = require("express");
const cors = require("cors");
require("./config/db");
const path = require("path");
const app = express();
app.use(cors());
app.use(express.json());

const cron = require("node-cron")
const Offer = require("./models/admin/OfferModel");
const Product = require("./models/admin/ProductModel")
const DealOfTheDay = require("./models/Vendor/DealofthedayModel");


// Token Refresh Route
const tokenRefresh = require("./routes/token/refreshToken");

// Admin Routes
const adminAuth = require("./routes/admin/authRoute");
const SubcategoryRoutes = require("./routes/admin/SubCategory/SubCategoryRoute");
const ProductRoutes = require("./routes/admin/Product/ProductRoute");
const CategoryRoutes = require("./routes/admin/categoryRoute");
const MainCategoryRouter = require("./routes/admin/MainCategory/mainCategoryRoute");
const NotificationRouter = require("./routes/admin/Notification/notificationRoute");
const carouselRouter = require("./routes/admin/Carousel/carouselRoute");
const adminVendorRoute = require("./routes/admin/Vendor/VendorRoute");
const OfferRouter = require('./routes/admin/Offer/offerRoutes');
const couponRouter = require('./routes/admin/Coupon/couponRoutes');
const adminOrder = require('./routes/admin/Order/orderRoutes');
const adminInvoice = require('./routes/admin/Invoice/invoiceRoutes');
const adminUser = require('./routes/admin/User/UserRoutes');
const adminDashboard = require('./routes/admin/Dashboard/DashboardRoute');

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


// User Routes
const userAuth = require("./routes/User/authRoutes");
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

// Token Refresh
app.use("/token", tokenRefresh);


// Admin Routes
app.use("/admin/auth", adminAuth);
app.use("/admin/subcategory", SubcategoryRoutes);
app.use("/admin/product", ProductRoutes);
app.use("/admin/category", CategoryRoutes);
app.use("/admin/maincategory", MainCategoryRouter);
app.use("/admin/notification", NotificationRouter);
app.use("/admin/carousel", carouselRouter);
app.use("/admin/vendor", adminVendorRoute);
app.use('/admin/offer', OfferRouter)
app.use('/admin/coupon', couponRouter);
app.use('/admin/order', adminOrder);
app.use('/admin/invoice', adminInvoice);
app.use('/admin/user', adminUser);
app.use('/admin/dashboard', adminDashboard);


// Vendor Routes
app.use("/vendor/auth", vendorAuth);
app.use("/vendor/maincategory", vendorMaincategory);
app.use("/vendor/category", vendorCategory);
app.use("/vendor/subcategory", vendorSubcategory);
app.use("/vendor/profile", vendorProfile);
app.use("/vendor/notification", vendorNotification);
app.use("/vendor/product", vendorProduct);
app.use("/vendor/carousel", vendorCarousel);
app.use("/vendor/offer", vendorOffer);
app.use("/vendor/coupon", vendorCoupon);
app.use("/vendor/dealoftheday", vendorDealOfTheDay);
app.use("/vendor/dashboard", vendorDashboard);


// User Routes
app.use("/user/auth", userAuth);
app.use("/user/maincategory", userMainCategoryRoutes);
app.use("/user/category", userCategoryRoutes);
app.use("/user/subcategory", userSubCategoryRoutes);
app.use("/user/product", userProductRoutes);
app.use("/user/wishlist", wishlistRoutes);
app.use("/user/cart", cartRoutes);
app.use("/user/address", addressRoutes);
app.use("/user/checkout", checkoutRoutes);
app.use("/user/order",orderRoutes)
app.use("/user/reviews",userReviewsRoutes)
app.use("/user/complaint",complaintsRoutes)
app.use("/user/dealoftheday",dealofthedayUserRoutes)


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
    }

    // Delete expired deals
    await DealOfTheDay.deleteMany({ expiresAt: { $lte: currentTime } });

    console.log("Expired deals cleaned up successfully");
  } catch (error) {
    console.error("Error cleaning up expired deals:", error);
  }
});

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
    console.log(`Server started listening at PORT ${PORT}`);
});
