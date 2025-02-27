require("dotenv").config()
const express = require("express")
const cors = require("cors")
require('./config/db')
const path = require('path')
const app = express()
app.use(cors())
app.use(express.json())

const tokenRefresh = require('./routes/token/refreshToken')
const SubcategoryRoutes = require('./routes/admin/SubCategory/SubCategoryRoute');
const ProductRoutes = require('./routes/admin/Product/ProductRoute');
const CategoryRoutes = require('./routes/admin/categoryRoute');
const MainCategoryRouter = require('./routes/admin/MainCategory/mainCategoryRoute');
const NotificationRouter = require('./routes/admin/Notification/notificationRoute');
const adminAuth = require('./routes/admin/authRoute');
const carouselRouter = require('./routes/admin/Carousel/carouselRoute')

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



app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
 



const PORT = process.env.PORT || 3006; 

app.listen(PORT,()=>{
    console.log(`server started listening at PORT ${PORT}`);
}) 