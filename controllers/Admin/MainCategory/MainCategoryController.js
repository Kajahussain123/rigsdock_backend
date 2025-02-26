const MainCategory = require('../../../models/admin/MainCategoryModel');

//create new maincategory
exports.createMainCategory = async(req,res) => {
    try {
        const { name,description } = req.body;
        if(!name || !description){
            return res.status(400).json({ message: 'name and description is required' })
        }
        const newMainCategory = new MainCategory({
            name,
            description
        });
        await newMainCategory.save();
        res.status(201).json({
            message: "Main Category created successfully",
            MainCategory: newMainCategory,
          });
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ message: "Internal Server Error", error });
    }
}

//get main category
exports.getMainCategory = async(req,res) => {
    try {
        const mainCategories = await MainCategory.find();
        if(!mainCategories) {
            return res.status(404).json({ message: "Product not found" })
        }
        res.status(200).json({ message: "mainCategories fetched successfully",mainCategories })
    } catch (error) {
        res.status(500).json({ message: "Error fetching mainCategories", error: error.message });
    }
}