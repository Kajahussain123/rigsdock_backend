require("dotenv").config()
const express = require("express")
const cors = require("cors")
require('./config/db')
const path = require('path')
const app = express()
app.use(cors())
app.use(express.json())

const tokenRefresh = require('./routes/token/refreshToken')


app.use('/token',tokenRefresh)


app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
 
const PORT = process.env.PORT || 3006;

app.listen(PORT,()=>{
    console.log(`server started listening at PORT ${PORT}`);
})