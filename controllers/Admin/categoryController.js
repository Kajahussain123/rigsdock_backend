const Category = require('../../models/admin/categoryModel');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

exports.createCategory = async (req, res) => {
    const { name, description, status, maincategory, commissionPercentage } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'Category image is required' });
    }

    try {
        const newCategory = new Category({
            name,
            // FIXED: Store the full S3 key instead of just filename
            image: req.file.key || req.file.s3Key, // This gives you "uploads/1751708756061-blog.jpg"
            description,
            maincategory,
            status: status || 'active',
            commissionPercentage: commissionPercentage || 0,
        });

        await newCategory.save();
        res.status(201).json({ 
            message: 'Category created successfully', 
            category: {
                ...newCategory.toObject(),
                // Provide the public URL for immediate use
                imageUrl: req.file.publicUrl || req.file.path
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Error creating category', error: err.message });
    }
};

// 🚀 Get all categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().populate('maincategory');

        const categoriesWithSubCount = await Promise.all(
            categories.map(async (category) => {
                // Count subcategories for this category
                const subCategoryCount = await mongoose.model('SubCategory').countDocuments({
                    category: category._id
                });
                
                // Convert to plain object and add subCategoryCount
                const categoryObj = category.toObject();
                categoryObj.subCategoryCount = subCategoryCount;
                
                // ADDED: Generate public URL for the image
                if (categoryObj.image) {
                    // If it's already a full URL, use it as is
                    if (categoryObj.image.startsWith('http')) {
                        categoryObj.imageUrl = categoryObj.image;
                    } else {
                        // Generate public URL from S3 key
                        const s3Key = categoryObj.image.startsWith('uploads/') 
                            ? categoryObj.image 
                            : `uploads/${categoryObj.image}`;
                        categoryObj.imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
                    }
                }
                
                return categoryObj;
            })
        );

        res.status(200).json({
            categories: categoriesWithSubCount
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching categories', error: err.message });
    }
};

// 🚀 Get a category by ID
exports.getCategoryById = async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const categoryObj = category.toObject();
        
        // ADDED: Generate public URL for the image
        if (categoryObj.image) {
            if (categoryObj.image.startsWith('http')) {
                categoryObj.imageUrl = categoryObj.image;
            } else {
                const s3Key = categoryObj.image.startsWith('uploads/') 
                    ? categoryObj.image 
                    : `uploads/${categoryObj.image}`;
                categoryObj.imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
            }
        }

        res.status(200).json(categoryObj);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching category', error: err.message });
    }
};

// 🚀 Update category (Only description & status)
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { description, status, commissionPercentage } = req.body;

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        if (description !== undefined) category.description = description;
        if (status !== undefined) category.status = status;
        if (commissionPercentage !== undefined) category.commissionPercentage = commissionPercentage;

        await category.save();
        
        // ADDED: Include image URL in response
        const categoryObj = category.toObject();
        if (categoryObj.image) {
            if (categoryObj.image.startsWith('http')) {
                categoryObj.imageUrl = categoryObj.image;
            } else {
                const s3Key = categoryObj.image.startsWith('uploads/') 
                    ? categoryObj.image 
                    : `uploads/${categoryObj.image}`;
                categoryObj.imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
            }
        }

        res.status(200).json({ message: 'Category updated successfully', category: categoryObj });
    } catch (err) {
        res.status(500).json({ message: 'Error updating category', error: err.message });
    }
};

// 🚀 Delete category
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await Category.findByIdAndDelete(id);
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting category', error: err.message });
    }
};

exports.getSubCategoriesByMainCategory = async (req, res) => {
    try {
        const { mainCategoryId } = req.params;
        const subcategories = await Category.find({ maincategory: mainCategoryId });

        if (!subcategories.length) {
            return res.status(404).json({ message: 'No subcategories found for this main category' });
        }

        // ADDED: Generate image URLs for subcategories
        const subcategoriesWithImageUrls = subcategories.map(subcategory => {
            const subcategoryObj = subcategory.toObject();
            if (subcategoryObj.image) {
                if (subcategoryObj.image.startsWith('http')) {
                    subcategoryObj.imageUrl = subcategoryObj.image;
                } else {
                    const s3Key = subcategoryObj.image.startsWith('uploads/') 
                        ? subcategoryObj.image 
                        : `uploads/${subcategoryObj.image}`;
                    subcategoryObj.imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
                }
            }
            return subcategoryObj;
        });

        res.status(200).json(subcategoriesWithImageUrls);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching subcategories', error: err.message });
    }
};