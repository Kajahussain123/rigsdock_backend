const express = require("express");
const router = express.Router();
const complaintController = require("../../controllers/User/ComplaintController");
const multerConfig = require('../../middleware/multer');

const upload = multerConfig.fields([
    { name: "images", maxCount: 5 },
    { name: "file", maxCount: 1 },
])

// Register a complaint (User can upload images)
router.post("/register", upload, complaintController.registerComplaint);

// Get all complaints for a user
router.get("/user/:userId", complaintController.getUserComplaints);

// Get a specific complaint by ID
router.get("/:complaintId", complaintController.getComplaintById);

// Update complaint status (Admin/Vendor only)
router.patch("/update/:complaintId", complaintController.updateComplaintStatus);

// Delete a complaint (Optional)
router.delete("/delete/:complaintId", complaintController.deleteComplaint);

module.exports = router;
