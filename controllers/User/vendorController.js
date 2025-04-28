const Vendor = require('../../models/Vendor/vendorModel');
const bcrypt = require('bcrypt');

exports.createVendor = async (req, res) => {
    try {
        // Check if vendor with same email or phone already exists
        const existingVendorMail = await Vendor.findOne({ email: req.body.email });
        if (existingVendorMail) {
            return res.status(409).json({ message: 'Vendor email already exists' });
        }
        const existingVendorPhone = await Vendor.findOne({ number: req.body.number });
        if (existingVendorPhone) {
            return res.status(409).json({ message: 'Vendor phone number already exists' });
        }
        // Check verification statuses from frontend
        const { isGstVerified, isPanVerified, isBankVerified } = req.body;
        if (req.body.gstNumber && !isGstVerified) {
            return res.status(400).json({ message: 'GST number must be verified before proceeding' });
        }
        if (req.body.panNumber && !isPanVerified) {
            return res.status(400).json({ message: 'PAN number must be verified before proceeding' });
        }
        if (req.body.accountNumber && !isBankVerified) {
            return res.status(400).json({ message: 'Bank account must be verified before proceeding' });
        }
        // File validations
        const images = req.files.images;
        const storeLogo = req.files.storelogo?.[0];
        const license = req.files.license?.[0];
        const passbookPhoto = req.files.passbookPhoto?.[0];
        if (!storeLogo) {
            return res.status(422).json({ message: "Store logo is required" });
        }
        if (!license) {
            return res.status(422).json({ message: "License is required" });
        }
        if (!images || images.length === 0) {
            return res.status(422).json({ message: "At least one vendor image is required" });
        }
        if (!passbookPhoto) {
            return res.status(422).json({ message: "Passbook photo is required" });
        }
        const imagePaths = images.map(file => file.filename);
        // Create vendor with verification status
        const newVendor = new Vendor({
            ...req.body,
            storelogo: storeLogo.filename,
            license: license.filename,
            passbookPhoto: passbookPhoto.filename,
            images: imagePaths,
            isGstVerified: isGstVerified || false,
            isPanVerified: isPanVerified || false,
            isBankVerified: isBankVerified || false,
            status: "pending"
        });
        await newVendor.save();
        res.status(201).json({
            message: "Vendor registration request submitted successfully. Waiting for admin approval",
            vendor: newVendor
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
