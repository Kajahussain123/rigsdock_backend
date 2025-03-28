const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const vendorSchema = new mongoose.Schema({
    ownername: {
        type: String,
        required:[true, "ownername is required"],
    },
    email:{
        type:String,
        required:[true, "Email is required"],
        unique:true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            "Please enter a valid email address"
        ],
    },
    businessname: {
        type: String,
        required:[true, "business name is required"],
    },
    businesslocation: {
        type: String,
        required:[true, "business location is required"],
    },
    businesslandmark: {
        type: String,
        required:[true, "business landmark is required"],
    },
    number: {
        type: String,
        required: [true, "phone number is required"],
        match: [
            /^\d{10}$/,
            "Please enter a valid 10-digit phone number"
        ],
    },
    address: {
        type: String,
        required:[true, "address is required"],
    },
    city: {
        type: String,
        required:[true, "city is required"],
    },
    state: {
        type: String,
        required:[true, "state is required"],
    },
    pincode: {
        type: Number,
        required:[true, "pincode is required"],
    },
    storelogo: {
        type: String,
        required: [true, "store logo is required"],
        validate: {
            validator: function (value) {
                return /\.(png|jpg|jpeg)$/i.test(value);
            },
            message: "Store logo must be a PNG, JPG, or JPEG file",
        },
    },
    license: {
        type: String,
        required: [true, "license is required"],
        validate: {
            validator: function (value) {
                return /\.(pdf|doc|docx|jpg|jpeg)$/i.test(value);
            },
            message: "License must be a PDF, DOC, DOCX, JPG, or JPEG file",
        },
    },
    images: {
        type: [String],
        required:[true, "At least one display image is required"],
    },
    description: {
        type: String,
        required:[true, "description is required"],
    },
    storetype: {
        type:String,
    },
    password: {
        type: String, 
        required:[true, "password is required"],
        minlength: [6, 'Password must be at least 6 characters long'],
    },
    // ratingsAverage: { 
    //     type: Number,  
    //     default: 0, 
    //     min: 0, 
    //     max: 5
    // },
    role: {
        type: String,
        default: "Vendor"
    },
    status: {
        type: String,
        enum: ["pending","approved","rejected"],
        default: "approved"
    },
    pendingUpdates: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: () => new Map()
    },
    updateProfile: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "approved"
    },
    workingDays: {
        type: [{
            type: String,
            enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        }],
        required: [true, "At least one working day is required"],
        validate: {
            validator: function (value) {
                return value.length > 0; // Ensure at least one day is selected
            },
            message: "At least one working day must be selected"
        }
    },
    openingTime: {
        type: String,
        enum: [
            "12:00 AM", "12:30 AM", 
            "1:00 AM", "1:30 AM", 
            "2:00 AM", "2:30 AM", 
            "3:00 AM", "3:30 AM", 
            "4:00 AM", "4:30 AM", 
            "5:00 AM", "5:30 AM", 
            "6:00 AM", "6:30 AM", 
            "7:00 AM", "7:30 AM", 
            "8:00 AM", "8:30 AM", 
            "9:00 AM", "9:30 AM", 
            "10:00 AM", "10:30 AM", 
            "11:00 AM", "11:30 AM", 
            "12:00 PM", "12:30 PM", 
            "1:00 PM", "1:30 PM", 
            "2:00 PM", "2:30 PM", 
            "3:00 PM", "3:30 PM", 
            "4:00 PM", "4:30 PM", 
            "5:00 PM", "5:30 PM", 
            "6:00 PM", "6:30 PM", 
            "7:00 PM", "7:30 PM", 
            "8:00 PM", "8:30 PM", 
            "9:00 PM", "9:30 PM", 
            "10:00 PM", "10:30 PM", 
            "11:00 PM", "11:30 PM"
        ],
        required: [true, "Opening time is required"]
    },
    closingTime: {
        type: String,
        enum: [
            "12:00 AM", "12:30 AM", 
            "1:00 AM", "1:30 AM", 
            "2:00 AM", "2:30 AM", 
            "3:00 AM", "3:30 AM", 
            "4:00 AM", "4:30 AM", 
            "5:00 AM", "5:30 AM", 
            "6:00 AM", "6:30 AM", 
            "7:00 AM", "7:30 AM", 
            "8:00 AM", "8:30 AM", 
            "9:00 AM", "9:30 AM", 
            "10:00 AM", "10:30 AM", 
            "11:00 AM", "11:30 AM", 
            "12:00 PM", "12:30 PM", 
            "1:00 PM", "1:30 PM", 
            "2:00 PM", "2:30 PM", 
            "3:00 PM", "3:30 PM", 
            "4:00 PM", "4:30 PM", 
            "5:00 PM", "5:30 PM", 
            "6:00 PM", "6:30 PM", 
            "7:00 PM", "7:30 PM", 
            "8:00 PM", "8:30 PM", 
            "9:00 PM", "9:30 PM", 
            "10:00 PM", "10:30 PM", 
            "11:00 PM", "11:30 PM"
        ],
        required: [true, "Closing time is required"]
    },
    country: {
        type:String,
        required: [true, "country field is required"]
    },
},{ timestamps: true });

vendorSchema.pre('save',async function(next){
    if(this.isModified('password')){
        this.password = await bcrypt.hash(this.password,10);
    }
    next();
})

const vendor = mongoose.model('Vendor',vendorSchema);
module.exports = vendor;