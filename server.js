require("dotenv").config()
const express = require("express")
const cors = require("cors")
require('./config/db')
const path = require('path')
const app = express()
app.use(cors())
app.use(express.json())

const cron = require("node-cron")
const Offer = require("./models/admin/OfferModel");
const Product = require("./models/admin/ProductModel")

const tokenRefresh = require('./routes/token/refreshToken')
const SubcategoryRoutes = require('./routes/admin/SubCategory/SubCategoryRoute');
const ProductRoutes = require('./routes/admin/Product/ProductRoute');
const CategoryRoutes = require('./routes/admin/categoryRoute');
const MainCategoryRouter = require('./routes/admin/MainCategory/mainCategoryRoute');
const NotificationRouter = require('./routes/admin/Notification/notificationRoute');
const adminAuth = require('./routes/admin/authRoute');
const carouselRouter = require('./routes/admin/Carousel/carouselRoute')
const OfferRouter = require('./routes/admin/Offer/offerRoutes');
const adminVendorRoute = require('./routes/admin/Vendor/VendorRoute');

app.use('/token',tokenRefresh)


// admin routes
app.use('/admin/auth',adminAuth);
app.use('/admin/subcategory',SubcategoryRoutes);
app.use('/admin/product',ProductRoutes);
app.use('/admin/category', CategoryRoutes); 
app.use('/admin/maincategory', MainCategoryRouter);
app.use('/admin/notification', NotificationRouter);
app.use('/admin/carousel', carouselRouter);
app.use('/admin/vendor', adminVendorRoute);
app.use('/admin/offer', OfferRouter)


app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
 
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

app.listen(PORT,()=>{
    console.log(`server started listening at PORT ${PORT}`);
}) 