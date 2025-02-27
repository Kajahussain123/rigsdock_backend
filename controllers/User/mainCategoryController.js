const MainCategory = require('../../models/admin/MainCategoryModel');


exports.getMainCategory = async(req,res) => {
    try {
        const mainCategories = await MainCategory.find();
        if(mainCategories.length === 0) {
            return res.status(404).json({ message: "Main Categories not found" })
        }
        res.status(200).json({ message: "mainCategories fetched successfully",mainCategories })
    } catch (error) {
        res.status(500).json({ message: "Error fetching mainCategories", error: error.message });
    }
}