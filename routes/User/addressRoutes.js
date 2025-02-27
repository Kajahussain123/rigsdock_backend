const express = require("express");
const router = express.Router();
const addressController = require("../../controllers/User/AddressController");

// Add new address
router.post("/add", addressController.addAddress);

// Get all addresses for a user
router.get("/:userId", addressController.getUserAddresses);

// Get a single address by ID
router.get("/single/:addressId", addressController.getAddressById);

// Update address
router.patch("/update/:addressId", addressController.updateAddress);

// Delete address
router.delete("/delete/:addressId", addressController.deleteAddress);

module.exports = router;
