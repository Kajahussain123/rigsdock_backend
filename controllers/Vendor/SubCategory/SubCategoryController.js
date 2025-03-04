const SubCategory = require('../../../models/admin/SubCategoryModel');

// get all sub categories
exports.getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate('category')
    if(subCategories.length === 0){
        return res.status(404).json({ message: "SubCategories not found" })
    }
    res.status(200).json({ subCategories });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching categories", error: err.message });
  }
};

// get subcategory by category
exports.getSubCategoryByCategory = async(req,res) => {
    const { categoryId } = req.params;
    try {
        const subcategories = await SubCategory.find({category: categoryId}).populate('category');
        if(subcategories.length === 0){
            return res.status(404).json({ message: 'subcategories not found' })
        }
        res.status(200).json(subcategories)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subcategories', error: error.message });
    }
}