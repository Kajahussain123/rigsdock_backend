const Product = require("../../models/admin/ProductModel");

// Get all products
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('maincategory')
            .populate('category')
            .populate('subcategory');

        if (products.length === 0) {
            return res.status(400).json({ message: 'No products' });
        }
        res.status(200).json({ message: "Products fetched successfully", products });
    } catch (error) {
        res.status(500).json({ message: "Error fetching products", error: error.message });
    }
};

// Get products by main category ID, category ID, and subcategory ID
exports.getProductsByCategoryHierarchy = async (req, res) => {
    try {
        const { mainCategoryId, categoryId, subCategoryId } = req.params;

        const products = await Product.find({
            maincategory: mainCategoryId,
            category: categoryId,
            subcategory: subCategoryId
        }).populate('maincategory').populate('category').populate('subcategory');

        if (products.length === 0) {
            return res.status(404).json({ message: "No products found for the given category hierarchy" });
        }

        res.status(200).json({ message: "Products fetched successfully", products });
    } catch (error) {
        res.status(500).json({ message: "Error fetching products", error: error.message });
    }
};

exports.getProductById = async (req,res) => {
  try {
    const {id} = req.params;
    const product = await Product.findOne({_id:id});
    if(!product){
      return res.status(404).json({ message: 'No product found' });
    }
    res.status(200).json({ message: "Product fetched successfully",product })
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}