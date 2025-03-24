const Vendor = require('../../models/Vendor/vendorModel');
const bcrypt = require('bcrypt');

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
            images: imagePaths,
            status: "pending"
        });
        await newVendor.save();
        res.status(201).json({ message: "Vendor registration request submitted successfully. Waiting for admin approval", vendor: newVendor });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message});
    }
}