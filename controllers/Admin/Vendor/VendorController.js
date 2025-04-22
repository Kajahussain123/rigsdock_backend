const Vendor = require('../../../models/Vendor/vendorModel');
const fs = require('fs');
const path = require('path');
const Order = require('../../../models/User/OrderModel')
const PlatformFee = require('../../../models/admin/PlatformFeeModel');

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
        return res.status(400).json({ message: "Please provide a month in YYYY-MM format" });
    }

    const [year, monthIndex] = month.split("-");
    const startDate = new Date(`${year}-${monthIndex}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // Next month

    try {
        // Build query
        const query = {
            createdAt: { $gte: startDate, $lt: endDate }
        };
        
        if (vendorId) {
            query.vendor = vendorId;
        }

        const orders = await Order.find(query)
            .populate("user")
            .populate({
                path: "items.product",
                populate: [
                    { path: "owner", model: "Vendor" },
                    { path: "category", model: "Category" }
                ]
            });

        if (!orders.length) {
            return res.status(404).json({ message: "No orders found for the given criteria" });
        }

        const platformFeeData = await PlatformFee.findOne().sort({ createdAt: -1 });
        const platformFee = platformFeeData?.amount || 0;

        const ordersWithStats = orders.map(order => {
            const itemsWithCommission = order.items.map(item => {
                const commissionPercentage = item.product?.category?.commissionPercentage || 0;
                const commissionAmount = (item.price * commissionPercentage) / 100;
                const vendorAmount = item.price - commissionAmount;

                return {
                    ...item.toObject(),
                    commissionPercentage,
                    commissionAmount,
                    vendorAmount
                };
            });

            const totalCommission = itemsWithCommission.reduce((sum, i) => sum + i.commissionAmount, 0);
            const totalVendorAmount = itemsWithCommission.reduce((sum, i) => sum + i.vendorAmount, 0);

            return {
                ...order.toObject(),
                platformFee,
                totalCommission,
                totalVendorAmount,
                items: itemsWithCommission
            };
        });

        res.status(200).json({
            message: "Monthly vendor report generated",
            totalOrders: orders.length,
            report: ordersWithStats
        });
    } catch (error) {
        res.status(500).json({ message: "Error generating report", error: error.message });
    }
};


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

        // Filter orders that include items from this vendor
        const vendorOrders = orders.filter(order =>
            order.items.some(item => item.product.owner?._id.toString() === id)
        );

        let totalSettledAmount = 0;
        let totalBalance = 0;
        let transactionHistory = [];

        for (const order of vendorOrders) {
            const vendorItems = order.items.filter(item => item.product.owner?._id.toString() === id);

            let vendorAmount = 0;
            let commission = 0;

            const detailedItems = vendorItems.map(item => {
                const commissionPercentage = item.product.category?.commissionPercentage || 0;
                const commissionAmount = (item.price * commissionPercentage) / 100;
                const vendorNet = item.price - commissionAmount;

                vendorAmount += vendorNet;
                commission += commissionAmount;

                return {
                    productName: item.product.name,
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