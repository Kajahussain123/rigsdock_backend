const Brand = require("../../../controllers/Admin/Brand");
const fs = require("fs");
const path = require("path");


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


