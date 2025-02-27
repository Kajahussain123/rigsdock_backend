const Category = require('../../models/admin/categoryModel');

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().populate('maincategory');
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching categories', error: err.message });
    }
};

// Get subcategories by main category ID
exports.getSubCategoriesByMainCategory = async (req, res) => {
    try {
        const { mainCategoryId } = req.params;
        const subcategories = await Category.find({ maincategory: mainCategoryId });

        if (!subcategories.length) {
            return res.status(404).json({ message: 'No subcategories found for this main category' });
        }

        res.status(200).json(subcategories);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching subcategories', error: err.message });
    }
};
