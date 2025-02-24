const Product = require("../../../models/admin/ProductModel");

//create a new subcategory
exports.createProduct = async (req, res) => {
  const { name, description, price, stock, subcategory, attributes } = req.body;
  try {
    // Validate required fields
    if (!name || !description || !price || !stock || !subcategory) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const newProduct = new Product({
      name,
      description,
      price,
      stock,
      subcategory,
      attributes: new Map(Object.entries(attributes)),
    });
    await newProduct.save();
    res.status(201).json({
      message: "Product created successfully",
      Product: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};
