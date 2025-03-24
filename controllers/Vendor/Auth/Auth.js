const Vendor = require('../../../models/Vendor/vendorModel');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/tokenUtils');
const bcrypt = require('bcrypt');

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
            images: imagePaths,
            status: "pending"
        });
        await newVendor.save();
        res.status(201).json({ message: "Vendor registration request submitted successfully. Waiting for admin approval", vendor: newVendor });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message});
    }
}

//login vendor 
exports.login = async(req,res) => {
    const { email,password } = req.body;
    try {
        const existingVendor = await Vendor.findOne({email});
        
        if(!existingVendor){
            return res.status(401).json({ message: "Invalid email or password" });
        }
        if(existingVendor.status === "pending"){
            return res.status(401).json({ message: "Wait for Admin Approvel" });
        }
        if(existingVendor.status === "rejected"){
            return res.status(401).json({ message: "Your Vendor request Rejected" });
        }
        const isPasswordValid = await bcrypt.compare(password,existingVendor.password);
        if(!isPasswordValid){
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const payload = { id: existingVendor._id, role: existingVendor.role };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        return res.status(200).json({
            message: "Vendor Logined successfully.",
            vendorId: existingVendor._id,
            role:existingVendor.role,
            accessToken,
            refreshToken
        });

    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}