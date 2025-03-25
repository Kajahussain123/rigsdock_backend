const Complaint = require("../../models/User/ComplaintModel");
const Order = require("../../models/User/OrderModel");
const Product = require("../../models/admin/ProductModel");
const multer = require("multer");
const path = require("path");
const { registerShiprocketReturnOrder } = require('../../controllers/Shiprocket/ShipRocketController');


// Register a complaint (only for delivered products)
exports.registerComplaint = async (req, res) => {
    try {
        const { userId, orderId, productId, complaintType, description } = req.body;

        // Ensure req.files is not undefined before mapping
        const imagePaths = req.files ? req.files.map((file) => file.filename) : [];

        // Check if the order exists and is delivered
        const order = await Order.findOne({
            _id: orderId,
            user: userId,
            orderStatus: "Delivered",
            "items.product": productId
        }).populate('user').populate('shippingAddress').populate('items.product').populate('vendor');

        if (!order) {
            return res.status(400).json({ message: "You can only register a complaint for delivered products." });
        }

        // Validate if the product exists in the order
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(400).json({ message: "Product not found" });
        }

        // Create a new complaint
        const newComplaint = new Complaint({
            user: userId,
            order: orderId,
            product: productId,
            complaintType,
            description,
            images: imagePaths // Store filenames if images are uploaded
        });

        await newComplaint.save();

        const returnOrderResponse = await registerShiprocketReturnOrder(order, product);

        // Update order status to "Return"
        order.orderStatus = "Return";
        await order.save();

        res.status(201).json({ 
            message: "Complaint registered successfully", 
            complaint: newComplaint, 
            shiprocketReturn: returnOrderResponse,
            updatedOrderStatus: order.orderStatus
        });
    } catch (error) {
        res.status(500).json({ message: "Error registering complaint", error: error.message });
    }
};


// Get all complaints for a user
exports.getUserComplaints = async (req, res) => {
    try {
        const { userId } = req.params;
        const complaints = await Complaint.find({ user: userId })
            .populate("product", "name")
            .populate("order", "orderStatus")
            .sort({ createdAt: -1 });

        res.status(200).json({ complaints });
    } catch (error) {
        res.status(500).json({ message: "Error fetching complaints", error: error.message });
    }
};

// Get a specific complaint by ID
exports.getComplaintById = async (req, res) => {
    try {
        const { complaintId } = req.params;

        const complaint = await Complaint.findById(complaintId)
            .populate("product", "name")
            .populate("order", "orderStatus")
            .populate("user", "name email");

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        res.status(200).json({ complaint });
    } catch (error) {
        res.status(500).json({ message: "Error fetching complaint", error: error.message });
    }
};

// Update complaint status (Admin/Vendor Action)
exports.updateComplaintStatus = async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { status } = req.body;

        const validStatuses = ["Pending", "In Progress", "Resolved", "Rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid complaint status" });
        }

        const updatedComplaint = await Complaint.findByIdAndUpdate(
            complaintId,
            { status },
            { new: true }
        );

        if (!updatedComplaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        res.status(200).json({ message: "Complaint status updated successfully", complaint: updatedComplaint });
    } catch (error) {
        res.status(500).json({ message: "Error updating complaint status", error: error.message });
    }
};

// Delete a complaint (if needed)
exports.deleteComplaint = async (req, res) => {
    try {
        const { complaintId } = req.params;

        const deletedComplaint = await Complaint.findByIdAndDelete(complaintId);

        if (!deletedComplaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        res.status(200).json({ message: "Complaint deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting complaint", error: error.message });
    }
};

