const generateInvoice = require("../../../utils/generateInvoice");
const fs = require('fs');

// Endpoint to download invoice
exports.downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Generate the invoice
    const filePath = await generateInvoice(orderId);

    // Send the invoice as a downloadable file
    res.download(filePath, `invoice-${orderId}.pdf`, (err) => {
      if (err) {
        console.error("Error downloading invoice:", err);
        res.status(500).json({ message: "Failed to download invoice" });
      } else {
        // Delete the file after sending it
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}