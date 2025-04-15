const SubCategory = require('../../../models/admin/SubCategoryModel');
const Product = require('../../../models/admin/ProductModel');

// // get all sub categories
// exports.getSubCategories = async (req, res) => {
//   try {
//     const subCategories = await SubCategory.find().populate('category')
//     if(subCategories.length === 0){
//         return res.status(404).json({ message: "SubCategories not found" })
//     }
//     res.status(200).json({ subCategories });
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: "Error fetching categories", error: err.message });
//   }
// };

// // get subcategory by category
// exports.getSubCategoryByCategory = async(req,res) => {
//     const { categoryId } = req.params;
//     try {
//         const subcategories = await SubCategory.find({category: categoryId}).populate('category');
//         if(subcategories.length === 0){
//             return res.status(404).json({ message: 'subcategories not found' })
//         }
//         res.status(200).json(subcategories)
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching subcategories', error: error.message });
//     }
// }

exports.getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate('category');

    if (subCategories.length === 0) {
      return res.status(404).json({ message: "SubCategories not found" });
    }

    const subCategoriesWithProductCount = await Promise.all(
      subCategories.map(async (sub) => {
        const productCount = await Product.countDocuments({ subcategory: sub._id });
        const subObj = sub.toObject();
        subObj.productCount = productCount;
        return subObj;
      })
    );

    res.status(200).json({ subCategories: subCategoriesWithProductCount });
  } catch (err) {
    res.status(500).json({ message: "Error fetching subcategories", error: err.message });
  }
};

exports.getSubCategoryByCategory = async (req, res) => {
  const { categoryId } = req.params;
  try {
    const subcategories = await SubCategory.find({ category: categoryId }).populate('category');

    if (subcategories.length === 0) {
      return res.status(404).json({ message: 'Subcategories not found' });
    }

    const enrichedSubcategories = await Promise.all(
      subcategories.map(async (sub) => {
        const productCount = await Product.countDocuments({ subcategory: sub._id });
        const subObj = sub.toObject();
        subObj.productCount = productCount;
        return subObj;
      })
    );

    res.status(200).json(enrichedSubcategories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subcategories', error: error.message });
  }
};
