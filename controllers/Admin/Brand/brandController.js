const Brand = require("../../../models/admin/BrandModel");
const fs = require("fs");
const path = require("path");


// Create Brand
exports.createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const image = req.file?.filename; // Assuming Multer is used for file upload

    if (!name || !image) {
      return res.status(400).json({ message: "Name and image are required." });
    }

    const newBrand = new Brand({ name, image });
    await newBrand.save();
    res.status(201).json(newBrand);
  } catch (error) {
    res.status(500).json({ message: "Failed to create brand", error });
  }
};

// Get All Brands
exports.getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });
    res.status(200).json(brands);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch brands", error });
  }
};

// Get Brand by ID
exports.getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    res.status(200).json(brand);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch brand", error });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    // Delete old image if new one is uploaded
    if (req.file) {
      const oldImagePath = path.join(__dirname, "../../../uploads/brands/", brand.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      brand.image = req.file.filename;
    }

    if (name) brand.name = name;
    await brand.save();
    res.status(200).json(brand);
  } catch (error) {
    res.status(500).json({ message: "Failed to update brand", error });
  }
};

// Delete Brand
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    // Delete image file
    const imagePath = path.join(__dirname, "../../../uploads/brands/", brand.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await Brand.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Brand deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete brand", error });
  }
};
