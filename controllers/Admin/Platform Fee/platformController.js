const PlatformFee = require("../../../models/admin/PlatformFeeModel");

// Set Platform Fee (Admin)
exports.setPlatformFee = async (req, res) => {
  try {
    const { feeType, amount } = req.body;

    let fee = await PlatformFee.findOne(); // Only one fee config exists
    if (!fee) {
      fee = new PlatformFee({ feeType, amount });
    } else {
      fee.feeType = feeType;
      fee.amount = amount;
    }

    await fee.save();
    res.status(200).json({ message: "Platform fee updated successfully", fee });
  } catch (error) {
    res.status(500).json({ message: "Error updating platform fee", error });
  }
};

// Get Current Platform Fee
exports.getPlatformFee = async (req, res) => {
  try {
    const fee = await PlatformFee.findOne();
    if (!fee) {
      return res.status(404).json({ message: "Platform fee not set" });
    }
    res.status(200).json(fee);
  } catch (error) {
    res.status(500).json({ message: "Error fetching platform fee", error });
  }
};
