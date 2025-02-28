const Vendor = require('../../../models/Vendor/vendorModel');
const fs = require('fs');
const path = require('path');

//create new vendor
exports.createVendor = async(req,res) => {
    try {
        const existingVendor = await Vendor.findOne({ email: req.body.email });
        if (existingVendor) {
            return res.status(409).json({ message: 'Vendor already exists' });
        }
        const images = req.files.images;
        const storeLogo = req.files.storelogo ? req.files.storelogo[0] : null;
        const license = req.files.license ? req.files.license[0] : null;
        
        if(!storeLogo) {
            return res.status(422).json({ message: "Store logo is required" });
        }
        if(!license) {
            return res.status(422).json({ message: "License is required" });
        }
        if(!images){
            return res.status(422).json({ message: "at least one vendor image required" })
        }
        const imagePaths = images.map((file) => file.filename);

        const newVendor = new Vendor({
            ...req.body,
            storelogo: storeLogo.filename,
            license: license.filename,
            images: imagePaths
        });
        await newVendor.save();
        res.status(201).json({ message: "vendor created successfully", vendor: newVendor });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message});
    }
}

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
exports.getVendorById = async(req,res) => {
    const { id } = req.params;
    try {
        const vendor = await Vendor.findById(id);
        if(!vendor){
            return res.status(404).json({ message: "vendor not found" });
        }
        res.status(200).json(vendor);
    } catch (error) {
        res.status(500).json({message: 'Error fetching vendor',error: error.message});
    }
}

// update vendor
exports.updateVendor = async(req,res) => {
    const { id } = req.params;
    try {
        const vendor = await Vendor.findById(id);
        if(!vendor){
            return res.status(404).json({ message: 'vendor not found' })
        }

        const images = req.files.images || [];
        const existingImages = vendor.images;
        const newImages = images.map((file) => file.filename);

        if(existingImages.length + newImages.length > 5){
            return res.status(400).json({ message: "Cannot have more than 5 images for a vendor" });
        }

        // Delete old store logo if a new one is uploaded
        if (req.files.storelogo && req.files.storelogo[0]) {
            const oldStoreLogoPath = path.join(__dirname, "../uploads/admin/vendor", vendor.storelogo);
            if (fs.existsSync(oldStoreLogoPath)) {
              fs.unlinkSync(oldStoreLogoPath);
            }
            vendor.storelogo = req.files.storelogo[0].filename;
          }
        
        // Delete old license if a new one is uploaded
        if (req.files.license && req.files.license[0]) {
            const oldLicensePath = path.join("./uploads", vendor.license);
            if (fs.existsSync(oldLicensePath)) {
            fs.unlinkSync(oldLicensePath);
            }
            vendor.license = req.files.license[0].filename;
        }

        const updatedVendorData = {
            ...req.body,
            images: [...existingImages,...newImages],
            storelogo: vendor.storelogo,
            license: vendor.license,
        }
        const updatedVendor = await Vendor.findByIdAndUpdate(id,updatedVendorData,{ new: true, runValidators: true  });
        res.status(200).json({
            message: "vendor updated successfully",
            updatedVendor
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating vendor', error: error.message });
    }
}

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
        const pendingVendors = await Vendor.find({ status: "pending" });
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