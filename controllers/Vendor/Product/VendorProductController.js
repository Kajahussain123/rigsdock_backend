const Product = require('../../../models/admin/ProductModel');
const path = require('path');
const fs = require('fs');
// const xlsx = require("xlsx");

//create a new product
exports.createProduct = async (req, res) => {
  const { name, description, price, stock,brand, subcategory, attributes,category,maincategory,deliveryfee } = req.body;
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one product image is required" });
    }

    const imagePaths = req.files.images.map((file) => file.filename);

    if (!name || !description || !price || !stock || !subcategory || !brand || !category || !maincategory) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let parsedAttributes;
    try {
      parsedAttributes = typeof attributes === "string" ? JSON.parse(attributes) : attributes;
    } catch (err) {
      return res.status(400).json({ message: "Invalid attributes format" });
    }

    const productData = {
      name,
      description,
      price,
      stock,
      images: imagePaths,
      brand,
      category,
      maincategory,
      ownerType: req.user.role,
      owner: req.user.id,
      attributes: new Map(Object.entries(attributes)),
    }
    if (subcategory && subcategory.trim().length > 0) {
      productData.subcategory = subcategory;
    }
    if(deliveryfee) {
      productData.deliveryfee = deliveryfee;
    }
    const newProduct = new Product(productData);
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

// get all products
exports.getProducts = async (req,res) => {
  try {
    const products = await Product.find({owner: req.user.id}).populate('maincategory').populate('category').populate('subcategory');
    if(products.length === 0 ){
      return res.status(400).json({ message: 'No products' });
    }
    res.status(200).json({ message: "Products fetched successfully",products })
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}

// get product by id
exports.getProductById = async (req,res) => {
  try {
    const {id} = req.params;
    const product = await Product.findById(id);
    if(!product){
      return res.status(404).json({ message: 'No product found' });
    }
    res.status(200).json({ message: "Product fetched successfully",product })
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}

// update product by id
exports.updateProduct = async(req,res) => {
  try {
    const {id} = req.params;
    const product = await Product.findById(id);
    if(!product){
      return res.status(404).json({ message: 'No product found' });
    }

    // Handle new images
    const existingImages = product.images || [];
    const newImages = req.files ? req.files.map((file) => file.filename) : [];
    const updatedImages = [...existingImages, ...newImages];

    // Get update fields from request body
    const updates = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      stock: req.body.stock,
      brand: req.body.brand,
      images: updatedImages,
      subcategory: req.body.subcategory,
    };

    // Handle attributes updates
    if (req.body.attributes) {
      // Convert existing attributes Map to plain object
      const currentAttributes = Object.fromEntries(
        product.attributes || new Map()
      );

      // Merge existing attributes with new attributes
      const mergedAttributes = {
        ...currentAttributes,
        ...req.body.attributes
      };

      // Convert merged attributes back to Map
      updates.attributes = new Map(Object.entries(mergedAttributes));
    }

    // Remove undefined fields
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { 
        new: true, 
        runValidators: true 
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
}

exports.deleteProduct = async(req,res) => {
  try {
    const {id} = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete images
    const basePath = "./uploads";
    product.images.forEach((image) => {
      const imagePath = path.join(basePath, image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });

    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
}

// Delete a specific image by name
exports.deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params; 
    const { imageName } = req.body;   
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    let imageToDelete = null;
    const updatedImages = product.images.filter((img) => {
      const imgFileName = img.split("\\").pop().split("/").pop();
      
      if (imgFileName === imageName) {
        imageToDelete = img;
        return false;
      }
      return true;
    });

    if (!imageToDelete) {
      return res.status(404).json({ message: "Image not found in product" });
    }

    const basePath = "./uploads";
    const imagePath = path.join(basePath,imageToDelete);

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(id,{ images: updatedImages },{ new: true });
    if(!updatedProduct){
      return res.status(404).json({ message: "Failed to delete image" })
    }
    res.status(200).json({ message: "Image deleted successfully", images: updatedProduct.images });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete product specific attributes
exports.deleteAttribute = async (req,res) => {
  try {
    const { attribute } = req.body;
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if(!product){
      return res.status(404).json({ message: "Product not found" });
    }
    if(product.attributes.has(attribute)) {
      product.attributes.delete(attribute);
      await product.save();
      return res.status(200).json({ message: `Attribute '${attribute}' deleted successfully`, product });
    } else {
      return res.status(404).json({ message: `Attribute '${attribute}' not found` });
    }
  } catch (error) {
    console.error("Error deleting attribute:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

// // Bulk upload endpoint
// exports.productBulkUpload = async(req,res) => {
//   try {
//     const file = req.file || req.files.file;
//     if (!file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }
//     // Read the Excel file
//     const workbook = xlsx.readFile(file[0].path);
//     const sheetName = workbook.SheetNames[0]; // Get the first sheet
//     const sheet = workbook.Sheets[sheetName];
//     const data = xlsx.utils.sheet_to_json(sheet); // Convert sheet to JSON

//     // Validate and process each row
//     const products = [];
//     for (const row of data) {
//       // Validate required fields
//       if (!row.name || !row.description || !row.price || !row.stock || !row.brand || !row.maincategory || !row.category || !row.subcategory) {
//         return res.status(400).json({ message: "Missing required fields in the Excel sheet" });
//       }

//       // Create a new product
//       const product = new Product({
//         name: row.name,
//         description: row.description,
//         price: row.price,
//         finalPrice: row.finalPrice || row.price, // Use finalPrice if provided, else default to price
//         stock: row.stock,
//         brand: row.brand,
//         maincategory: row.maincategory,
//         category: row.category,
//         subcategory: row.subcategory,
//         attributes: row.attributes ? JSON.parse(row.attributes) : {}, // Parse attributes if provided
//         ownerType: req.user.role,
//         owner: req.user.id,
//         images: row.images ? row.images.split(",") : [], // Split images string into an array
//         offer: row.offer || null // Use offer if provided
//       });

//       products.push(product);
//     }
//     await Product.insertMany(products);
//     res.status(201).json({ message: "Products uploaded successfully", count: products.length });
//   } catch (error) {
//     console.error("Error during bulk upload:", error);
//     res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// }