const HomeCategory = require("../../../models/admin/homeCategoryModel");
const fs = require('fs');
const path = require('path');

// Create a new home category
const createHomeCategory = async (req, res) => {
  try {
    const { title, subtitle } = req.body;
    
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required"
      });
    }

    // Validate required fields
    if (!title || !subtitle) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: "Title and subtitle are required"
      });
    }

    // Create new home category
    const newHomeCategory = new HomeCategory({
      title,
      subtitle,
      image: req.file.filename  // or req.file.filename depending on your multer config
    });

    const savedCategory = await newHomeCategory.save();

    res.status(201).json({
      success: true,
      message: "Home category created successfully",
      data: savedCategory
    });

  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error("Error creating home category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get all home categories
const getAllHomeCategories = async (req, res) => {
  try {
    const homeCategories = await HomeCategory.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: homeCategories,
      count: homeCategories.length
    });

  } catch (error) {
    console.error("Error fetching home categories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get single home category by ID
const getHomeCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const homeCategory = await HomeCategory.findById(id);

    if (!homeCategory) {
      return res.status(404).json({
        success: false,
        message: "Home category not found"
      });
    }

    res.status(200).json({
      success: true,
      data: homeCategory
    });

  } catch (error) {
    console.error("Error fetching home category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};


// Update home category
const updateHomeCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle } = req.body;

    // Find existing home category
    const existingCategory = await HomeCategory.findById(id);
    if (!existingCategory) {
      // Delete uploaded file if category doesn't exist
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: "Home category not found"
      });
    }

    // Prepare update data
    const updateData = {};

    if (title) updateData.title = title;
    if (subtitle) updateData.subtitle = subtitle;

    // Handle image update
    if (req.file) {
      // Delete old image if it exists
      if (existingCategory.image && fs.existsSync(existingCategory.image)) {
        fs.unlinkSync(existingCategory.image);
      }
      updateData.image = req.file.path;
    }

    // Update the category
    const updatedCategory = await HomeCategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Home category updated successfully",
      data: updatedCategory
    });

  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error("Error updating home category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Delete home category
const deleteHomeCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the category to delete
    const categoryToDelete = await HomeCategory.findById(id);
    if (!categoryToDelete) {
      return res.status(404).json({
        success: false,
        message: "Home category not found"
      });
    }

    // Delete associated image file
    if (categoryToDelete.image && fs.existsSync(categoryToDelete.image)) {
      fs.unlinkSync(categoryToDelete.image);
    }

    // Delete the category
    await HomeCategory.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Home category deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting home category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  createHomeCategory,
  getAllHomeCategories,
  getHomeCategoryById,
  updateHomeCategory,
  deleteHomeCategory
};