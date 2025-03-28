const Address = require("../../models/User/AddressModel");

// Add new address
exports.addAddress = async (req, res) => {
    try {
        const { userId, firstName,lastName, phone, addressLine1, addressLine2, city, state, zipCode, country, addressType, isDefault } = req.body;

        if (isDefault) {
            // Set all other addresses to not default
            await Address.updateMany({ user: userId }, { isDefault: false });
        }

        const newAddress = new Address({
            user: userId,
            firstName,
            lastName,
            phone,
            addressLine1,
            addressLine2,
            city,
            state,
            zipCode,
            country,
            addressType,
            isDefault,
        });

        await newAddress.save();
        res.status(201).json({ message: "Address added successfully", address: newAddress });
    } catch (error) {
        res.status(500).json({ message: "Error adding address", error: error.message });
    }
};

// Get all addresses for a user
exports.getUserAddresses = async (req, res) => {
    try {
        const { userId } = req.params;
        const addresses = await Address.find({ user: userId });

        if (!addresses.length) {
            return res.status(404).json({ message: "No addresses found" });
        }

        res.status(200).json(addresses);
    } catch (error) {
        res.status(500).json({ message: "Error fetching addresses", error: error.message });
    }
};

// Get a single address by ID
exports.getAddressById = async (req, res) => {
    try {
        const { addressId } = req.params;
        const address = await Address.findById(addressId);

        if (!address) {
            return res.status(404).json({ message: "Address not found" });
        }

        res.status(200).json(address);
    } catch (error) {
        res.status(500).json({ message: "Error fetching address", error: error.message });
    }
};

// Update address
exports.updateAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const updatedData = req.body;

        if (updatedData.isDefault) {
            // Set all other addresses to not default
            await Address.updateMany({ user: updatedData.user }, { isDefault: false });
        }

        const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

        if (!updatedAddress) {
            return res.status(404).json({ message: "Address not found" });
        }

        res.status(200).json({ message: "Address updated successfully", address: updatedAddress });
    } catch (error) {
        res.status(500).json({ message: "Error updating address", error: error.message });
    }
};

// Delete address
exports.deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const deletedAddress = await Address.findByIdAndDelete(addressId);

        if (!deletedAddress) {
            return res.status(404).json({ message: "Address not found" });
        }

        res.status(200).json({ message: "Address deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting address", error: error.message });
    }
};
