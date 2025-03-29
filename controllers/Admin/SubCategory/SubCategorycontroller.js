const mongoose = require('mongoose');
const SubCategory = require("../../../models/admin/SubCategoryModel");

//create a new subcategory
exports.createSubCategory = async (req, res) => {
  const { name, description,category,status } = req.body;
  try {
    if(!category){
      return res.status(400).json({ message: 'category is required' })
    }
    const newSubCategory = new SubCategory({ name, description,category,status });
    await newSubCategory.save();
    res
      .status(201)
      .json({
        message: "SubCategory created successfully",
        SubCategory: newSubCategory,
      });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

// get all sub categories
exports.getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate('category');

    const subCategoriesWithProductCount = await Promise.all(
      subCategories.map(async (subCategory) => {
        // Count products for this subcategory
        const productCount = await mongoose.model('Product').countDocuments({
          subcategory: subCategory._id
        });
        
        // Convert to plain object and add productCount
        const subCategoryObj = subCategory.toObject();
        subCategoryObj.productCount = productCount;
        
        return subCategoryObj;
      })
    );

    res.status(200).json({
      subCategories: subCategoriesWithProductCount
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching categories", error: err.message });
  }
};

// get a subCategory by id
exports.getSubCategoryById = async (req, res) => {
  const { id } = req.params;
  try {
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }
    res.status(200).json(subCategory);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching subcategory", error: err.message });
  }
};

// get subcategory by category
exports.getSubCategoryByCategory = async(req,res) => {
    const { id } = req.params;
    try {
        const subcategories = await SubCategory.find({category: id}).populate('category');
        if(subcategories.length === 0){
            return res.status(404).json({ message: 'subcategories not found' })
        }
        res.status(200).json(subcategories)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subcategories', error: error.message });
    }
}

// update subcategory

exports.updateSubCategory = async (req, res) => {
  const { id } = req.params;
  // const { name,description,category } = req.body;
  const { name, description, status, category } = req.body;

  try {
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }
    if (name) subCategory.name = name;
    if (description) subCategory.description = description;
    if(category) subCategory.category = category;
    if (status) subCategory.status = status;
    await subCategory.save();
    res
      .status(200)
      .json({ message: "SubCategory updated successfully", subCategory });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating SubCategory", error: err.message });
  }
};

// delete subcategory
exports.deleteSubCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res.status(404).json({ message: "Category not found" });
    }
    await SubCategory.findByIdAndDelete(id);
    res.status(200).json({ message: "SubCategory deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting subcategory", error: err.message });
  }
};


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
