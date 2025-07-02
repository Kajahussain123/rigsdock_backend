const Carousel = require("../../../models/admin/productCarousel");

const getAllCarousels = async (req, res) => {
  try {
    const carousels = await Carousel.find({ isActive: true })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: carousels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching carousels",
      error: error.message
    });
  }
};

// Create new carousel
const createCarousel = async (req, res) => {
  try {
    const { title, subtitle, startingPrice } = req.body;
    
    // Check if image file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required"
      });
    }

    const carousel = new Carousel({
      title,
      subtitle,
      image: req.file.filename , // Use the file path or filename from multer
      startingPrice,
    });

    await carousel.save();

    res.status(201).json({
      success: true,
      message: "Carousel created successfully",
      data: carousel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating carousel",
      error: error.message
    });
  }
};

// Update carousel
const updateCarousel = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If a new image file was uploaded, add it to updates
    if (req.file) {
      updates.image = req.file.filename || req.file.filename;
    }

    const carousel = await Carousel.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!carousel) {
      return res.status(404).json({
        success: false,
        message: "Carousel not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Carousel updated successfully",
      data: carousel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating carousel",
      error: error.message
    });
  }
};

// Delete carousel
const deleteCarousel = async (req, res) => {
  try {
    const { id } = req.params;

    const carousel = await Carousel.findByIdAndDelete(id);

    if (!carousel) {
      return res.status(404).json({
        success: false,
        message: "Carousel not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Carousel deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting carousel",
      error: error.message
    });
  }
};

module.exports = {
  getAllCarousels,
  createCarousel,
  updateCarousel,
  deleteCarousel,
};