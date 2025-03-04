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
const couponRouter = require('./routes/admin/Coupon/couponRoutes')

// Vendor Routes
const vendorAuth = require("./routes/Vendor/Auth/AuthRoute");


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


// Vendor Routes
app.use("/vendor/auth", vendorAuth);  

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

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
    console.log(`Server started listening at PORT ${PORT}`);
});
