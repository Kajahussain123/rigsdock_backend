const MainCategory = require('../../../models/admin/MainCategoryModel');

//create new maincategory
exports.createMainCategory = async(req,res) => {
    try {
        const { name,description } = req.body;

        if(!req.file){
            return res.status(400).json({ message: "Notification Image is required" })
        }

        if(!name || !description){
            return res.status(400).json({ message: 'name and description is required' })
        }
        const newMainCategory = new MainCategory({
            name,
            description,
            image: req.file.filename,
        });
        await newMainCategory.save();
        res.status(201).json({
            message: "Main Category created successfully",
            MainCategory: newMainCategory,
          });
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ message: "Internal Server Error", error:error.message });
    }
}

//get main category
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

// exports.updateMaincategory = async(req,res) => {
//     try {
//         const {id} = req.params;
//         const maincategory = await MainCategory.findByIdAndUpdate(id,{image:req.file.filename},{ new: true })
//         if(!maincategory) {
//             return res.status(404).json({ message: "Main Categories not updated" })
//         }
//         res.status(200).json({ message: "mainCategories updated successfully",maincategory })
//     } catch (error) {
//         res.status(500).json({ message: "Error updating mainCategories", error: error.message });
//     }
// }