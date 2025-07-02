const Product = require("../../../models/admin/ProductModel");
const Brand = require("../../../models/admin/BrandModel"); 
const fs = require("fs");
const path = require("path");

//create a new product
exports.createProduct = async (req, res) => {
  const { name, description, price, stock, brand, BISCode, HSNCode, subcategory, attributes, category, maincategory } = req.body;
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one product image is required" });
    }
    console.log(req.files.images)
    const imagePaths = req.files.images.map((file) => file.filename);

    if (!name || !description || !price || !stock || !brand || !category || !maincategory) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate brand ID exists
    const brandExists = await Brand.findById(brand);
    if (!brandExists) {
      return res.status(400).json({ message: "Invalid brand ID" });
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
      BISCode,
      HSNCode,
      category,
      maincategory,
      ownerType: req.user.role,
      owner: req.user.id,
      attributes: new Map(Object.entries(parsedAttributes)),
    }
    
    if (subcategory && subcategory.trim().length > 0) {
      productData.subcategory = subcategory;
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
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('maincategory')
      .populate('category')
      .populate('subcategory')
      .populate('brand'); // Add brand population
    
    if (products.length === 0) {
      return res.status(400).json({ message: 'No products' });
    }
    res.status(200).json({ message: "Products fetched successfully", products })
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}

// get product by id
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id })
      .populate('maincategory')
      .populate('category')
      .populate('subcategory')
      .populate('brand');
    
    if (!product) {
      return res.status(404).json({ message: 'No product found' });
    }
    res.status(200).json({ message: "Product fetched successfully", product })
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}

// get product by category
exports.getProductByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log(categoryId);
    const product = await Product.find({ category: categoryId })
      .populate('brand'); // Add brand population
    console.log(product)
    if (product.length === 0) {
      return res.status(404).json({ message: "no product founded" })
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}

// get product by subcategory
exports.getProductBySubcategory = async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    const product = await Product.find({ subcategory: subcategoryId })
      .populate('brand'); // Add brand population
    if (product.length === 0) {
      return res.status(404).json({ message: "no product founded" })
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}


exports.updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.' 
      });
    }

    // Validate status
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or pending.'
      });
    }

    // If rejecting, rejection reason is required
    if (status === 'rejected' && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a product.'
      });
    }

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    // Prepare update object
    const updateData = {
      status: status
    };

    // Handle approval
    if (status === 'approved') {
      updateData.approvedBy = req.user.id;
      updateData.approvedAt = new Date();
      updateData.rejectionReason = null;
      updateData.rejectedAt = null;
    }

    // Handle rejection
    if (status === 'rejected') {
      updateData.rejectionReason = rejectionReason.trim();
      updateData.rejectedAt = new Date();
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }

    // Handle pending (reset approval/rejection data)
    if (status === 'pending') {
      updateData.approvedBy = null;
      updateData.approvedAt = null;
      updateData.rejectionReason = null;
      updateData.rejectedAt = null;
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('owner', 'name email')
     .populate('maincategory')
     .populate('category')
     .populate('subcategory');

    // Generate response message
    let message;
    switch (status) {
      case 'approved':
        message = 'Product approved successfully';
        break;
      case 'rejected':
        message = 'Product rejected successfully';
        break;
      case 'pending':
        message = 'Product status reset to pending';
        break;
      default:
        message = 'Product status updated successfully';
    }

    res.status(200).json({
      success: true,
      message: message,
      product: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product status:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all pending products for admin review
exports.getPendingProducts = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.' 
      });
    }

    const pendingProducts = await Product.find({ 
      status: 'pending',
      ownerType: { $ne: 'Admin' } // Exclude admin's own products
    })
    .populate('owner', 'name email')
    .populate('maincategory')
    .populate('category')
    .populate('subcategory')
    .sort({ createdAt: -1 });

    if (pendingProducts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending products found',
        products: [],
        totalCount: 0
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pending products fetched successfully',
      products: pendingProducts,
      totalCount: pendingProducts.length
    });

  } catch (error) {
    console.error('Error fetching pending products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all products with status filter for admin
exports.getAllProductsWithStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.' 
      });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (status && ['approved', 'rejected', 'pending'].includes(status)) {
      query.status = status;
    }

    const products = await Product.find(query)
      .populate('owner', 'name email')
      .populate('maincategory')
      .populate('category')
      .populate('subcategory')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Product.countDocuments(query);

    // Group products by status for easier frontend handling
    const statusCounts = await Product.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusSummary = {
      approved: 0,
      pending: 0,
      rejected: 0
    };

    statusCounts.forEach(item => {
      statusSummary[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      products: products,
      totalCount: totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
      statusSummary: statusSummary
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// update product by id
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'No product found' });
    }

    // Validate brand ID if provided
    if (req.body.brand) {
      const brandExists = await Brand.findById(req.body.brand);
      if (!brandExists) {
        return res.status(400).json({ message: "Invalid brand ID" });
      }
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
      brand: req.body.brand, // This will be brand ID
      images: updatedImages,
      subcategory: req.body.subcategory,
      BISCode: req.body.BISCode,
      HSNCode: req.body.HSNCode,
      category: req.body.category,
      maincategory: req.body.maincategory,
    };

    // Handle attributes updates
    if (req.body.attributes) {
      let parsedAttributes;
      try {
        parsedAttributes = typeof req.body.attributes === "string" 
          ? JSON.parse(req.body.attributes) 
          : req.body.attributes;
      } catch (err) {
        return res.status(400).json({ message: "Invalid attributes format" });
      }

      // Convert existing attributes Map to plain object
      const currentAttributes = Object.fromEntries(
        product.attributes || new Map()
      );

      // Merge existing attributes with new attributes
      const mergedAttributes = {
        ...currentAttributes,
        ...parsedAttributes
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
    ).populate('brand').populate('maincategory').populate('category').populate('subcategory');

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
        message: 'Invalid ID format'
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

// Add a new endpoint to get products by brand
exports.getProductsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const products = await Product.find({ brand: brandId })
      .populate('brand')
      .populate('maincategory')
      .populate('category')
      .populate('subcategory');
    
    if (products.length === 0) {
      return res.status(404).json({ message: "No products found for this brand" });
    }
    
    res.status(200).json({
      message: "Products fetched successfully",
      products
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
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
    const imagePath = path.join(basePath, imageToDelete);

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, { images: updatedImages }, { new: true });
    if (!updatedProduct) {
      return res.status(404).json({ message: "Failed to delete image" })
    }
    res.status(200).json({ message: "Image deleted successfully", images: updatedProduct.images });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete product specific attributes
exports.deleteAttribute = async (req, res) => {
  try {
    const { attribute } = req.body;
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.attributes.has(attribute)) {
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
//       if (!row.name || !row.description || !row.price || !row.stock || !row.brand || !row.maincategory || !row.category) {
//         return res.status(400).json({ message: "Missing required fields in the Excel sheet" });
//       }
//       const maincategory = await MainCategory.findOne({ name: row.maincategory });
//       if(!maincategory){
//         return res.status(404).json({ message: "main category is required" })
//       }
//       const category = await Category.findOne({ name: row.category })
//       if(!category){
//         return res.status(404).json({ message: "category is required" })
//       }
//       let subcategory;
//       if(row.subcategory) {
//         subcategory = await SubCategory.findOne({ name: row.subcategory })
//       }

//       // Create a new product
//       const productData = {
//         name: row.name,
//         description: row.description,
//         price: row.price,
//         finalPrice: row.finalPrice || row.price, // Use finalPrice if provided, else default to price
//         stock: row.stock,
//         brand: row.brand,
//         maincategory: maincategory._id,
//         category: category._id,
//         attributes: row.attributes ? JSON.parse(row.attributes) : {}, // Parse attributes if provided
//         ownerType: req.user.role,
//         owner: req.user.id,
//         images: row.images ? row.images.split(",") : [], // Split images string into an array
//         offer: row.offer || null // Use offer if provided
//       };
//       if(subcategory){
//         productData.subcategory = subcategory._id;
//       }

//       products.push(productData);
//     }
//     const insertResult = await Product.insertMany(products, { rawResult: true });
//     console.log(insertResult)
//     // Get the inserted document IDs
//     const insertedIds = Object.values(insertResult.insertedIds);

//     const populatedProducts = await Product.find({ _id: { $in: insertedIds } }).populate("maincategory", "name").populate("category", "name");
//     res.status(201).json({ message: "Products uploaded successfully", count: products.length,products: populatedProducts });
//   } catch (error) {
//     // console.error("Error during bulk upload:", error);
//     res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// }