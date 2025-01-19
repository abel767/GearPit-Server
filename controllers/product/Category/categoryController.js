const Category = require('../../../models/Products/categoryModel');

const categoryData = async (req, res) => {
    // Fetches all categories and sorts them alphabetically by name
    try {
        const data = await Category.find().sort({ categoryName: 1 });
        res.status(200).json(data);
    } catch (error) {
        console.error('Category fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch categories',
            details: error.message,
        });
    }
};


const addCategoryData = async (req, res) => {
    // Creates a new category with optional description and active status
    try {
        const { categoryName, description = '', isActive = true } = req.body;

        // Check for existing category to prevent duplicates
        const existingCategory = await Category.findOne({
            categoryName: categoryName
        });

        if (existingCategory) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        // Initialize new category with default offer structure
        const newCategory = new Category({
            categoryName,
            description,
            isActive,
            offer: {
                percentage: 0,
                startDate: null,
                endDate: null,
                isActive: false
            }
        });

        const savedCategory = await newCategory.save();
        res.status(201).json({
            message: 'Category created successfully',
            category: savedCategory,
        });
    } catch (error) {
        console.error('Category creation error:', error);
        res.status(500).json({
            message: 'Error creating category',
            error: error.message,
        });
    }
};

const categoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        
        const updatedCategory = await Category.findByIdAndUpdate(
            id, 
            { isActive },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                message: 'Category not found'
            });
        }

        res.status(200).json(updatedCategory);
    } catch (error) {
        console.error('Category status update error:', error);
        res.status(500).json({
            message: 'Error updating category status',
            error: error.message
        });
    }
};

const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);
        
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

const categoryEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryName, description, offer } = req.body;

        const existingCategory = await Category.findOne({
            categoryName,
            _id: { $ne: id }
        });

        if (existingCategory) {
            return res.status(409).json({ message: 'Category name already exists' });
        }

        const updateData = {
            categoryName,
            description,
        };

        if (offer) {
            updateData.offer = offer;
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json(updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message,
        });
    }
};

const categoryDataForAddProduct = async (req, res) => {
    try {
        const activeCategories = await Category.find(
            { isActive: true },
            { _id: 1, categoryName: 1 }
        ).sort({ categoryName: 1 });

        if (activeCategories.length === 0) {
            return res.status(404).json({
                message: 'No active categories found',
                categories: [],
            });
        }

        res.status(200).json({ activeCategories });
    } catch (error) {
        console.error('Error fetching active categories', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    categoryData,
    addCategoryData,
    categoryStatus,
    categoryDataForAddProduct,
    categoryEdit,
    getCategoryById
};