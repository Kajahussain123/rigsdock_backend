const Vendor = require('../../../models/Vendor/vendorModel');

//get user profile
exports.getVendorProfile = async(req,res) => {
    try {
        const vendor = await Vendor.findById(req.user.id).select("-password");
        if(!vendor){
            return res.status(404).json({ message: "Vendor not found" });
        }

        res.status(200).json({ vendor });
    } catch (error) {
        res.status(500).json({ message: "Internal server error." })
    }
}

// update user profile
exports.updateProfile = async(req,res) => {
    try {
        const vendor = await Vendor.findById(req.user.id);
        if(!vendor){
            return res.status(404).json({ message: "Vendor not found" });
        }
        // check if there already a pending update
        if(vendor.updateProfile === "pending") {
            return res.status(400).json({ message: "You already have a pending update request" })
        }
        if ((!req.body || Object.keys(req.body).length === 0) && (!req.files || Object.keys(req.files).length === 0)) {
            return res.status(400).json({ message: "No updated data provided" });
        }

        // Convert req.body to a Map
        const pendingUpdates = new Map(Object.entries(req.body));

        // Handle file uploads
        if (req.files) {
            if (req.files.storelogo) {
                pendingUpdates.set("storelogo", req.files.storelogo[0].filename); // Save the file path
            }
            if (req.files.license) {
                pendingUpdates.set("license", req.files.license[0].filename); // Save the file path
            }
            if (req.files.images) {
                // Get the existing images (from pendingUpdates or the main profile)
                const existingImages = vendor.pendingUpdates?.get("images") || vendor.images || [];

                // Combine old images with new images
                const newImages = req.files.images.map(file => file.filename);
                const combinedImages = [...existingImages, ...newImages];

                // Save the combined images to pendingUpdates
                pendingUpdates.set("images", combinedImages);
            }
        }

        // Store the updated data in a temporary field
        vendor.pendingUpdates = pendingUpdates;
        vendor.updateProfile = "pending";
        await vendor.save();

        res.status(200).json({ message: "Update request submitted for admin approval", vendor });
    } catch (error) {
        console.error("Error handling vendor update request:", error);
        res.status(500).json({ message: "Internal server error." })
    }
}