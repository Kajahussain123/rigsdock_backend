const Category = require('../../models/admin/categoryModel');
const fs = require('fs');
const path = require('path');

exports.createCategory = async (req, res) => {
    const { name, description, status, maincategory } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'Category image is required' });
    }

    try {
        const newCategory = new Category({
            name,
            image: req.file.filename,
            description,
            maincategory,
            status: status || 'active',
        });

        await newCategory.save();
        res.status(201).json({ message: 'Category created successfully', category: newCategory });
    } catch (err) {
        res.status(500).json({ message: 'Error creating category', error: err.message });
    }
};

// 🚀 Get all categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().populate('maincategory');
        res.status(200).json(categories);
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
        res.status(200).json(category);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching category', error: err.message });
    }
};

// 🚀 Update category (Only description & status)
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { description, status } = req.body;

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        if (description) category.description = description;
        if (status) category.status = status;

        await category.save();
        res.status(200).json({ message: 'Category updated successfully', category });
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
