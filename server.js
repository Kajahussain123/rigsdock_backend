require("dotenv").config();
const express = require("express");
const cors = require("cors");
require("./config/db");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

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

// User Routes
const userAuth = require("./routes/User/authRoutes");
const userMainCategoryRoutes = require("./routes/User/mainCategoryRoutes");
const userCategoryRoutes = require("./routes/User/categoryRoutes");
const userSubCategoryRoutes = require("./routes/User/subCategoryRoutes");
const userProductRoutes = require("./routes/User/productRoutes");
const wishlistRoutes = require("./routes/User/wishlistRoutes");
const cartRoutes = require("./routes/User/cartRoutes");
const addressRoutes = require("./routes/User/addressRoutes");

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

// User Routes
app.use("/user/auth", userAuth);
app.use("/user/maincategory", userMainCategoryRoutes);
app.use("/user/category", userCategoryRoutes);
app.use("/user/subcategory", userSubCategoryRoutes);
app.use("/user/product", userProductRoutes);
app.use("/user/wishlist", wishlistRoutes);
app.use("/user/cart", cartRoutes);
app.use("/user/address", addressRoutes);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
    console.log(`Server started listening at PORT ${PORT}`);
});
