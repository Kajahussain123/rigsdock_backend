const SubCategory = require("../../models/admin/SubCategoryModel");


// get all sub categories
exports.getSubCategories = async (req, res) => {
    try {
      const subCategories = await SubCategory.find().populate('category')
      res.status(200).json({ subCategories });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching categories", error: err.message });
    }
  };

  // Get subcategories by main category ID and category ID
exports.getSubCategoriesByMainAndCategory = async (req, res) => {
    try {
        const { mainCategoryId, categoryId } = req.params;

        const subCategories = await SubCategory.find({ category: categoryId })
            .populate({
                path: 'category',
                match: { maincategory: mainCategoryId } 
            })
            .then(data => data.filter(sub => sub.category !== null)); 

        if (!subCategories.length) {
            return res.status(404).json({ message: "No subcategories found for this main category and category" });
        }

        res.status(200).json(subCategories);
    } catch (err) {
        res.status(500).json({ message: "Error fetching subcategories", error: err.message });
    }
};