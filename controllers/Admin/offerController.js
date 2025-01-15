const mongoose = require('mongoose')
const Product = require('../../models/Products/productModel')
const Category = require('../../models/Products/categoryModel')


const addProductOffer = async(req, res) => {
    try {
        const {productId, percentage, startDate, endDate} = req.body;

        if(!productId || !percentage || !startDate || !endDate) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        const product = await Product.findById(productId);
        if(!product) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        

        // Update the offer
        product.offer = {
            percentage,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: true
        };

        // Recalculate final prices for all variants
        product.variants = product.variants.map(variant => {
            let finalPrice = variant.price;
            
            // Apply variant discount first
            if (variant.discount > 0) {
                finalPrice = finalPrice * (1 - variant.discount / 100);
            }
            
            // Then apply the new product offer
            finalPrice = finalPrice * (1 - percentage / 100);

            return {
                ...variant,
                finalPrice: Math.round(finalPrice * 100) / 100
            };
        });

        await product.save();

        

        res.status(200).json({
            message: 'Product offer added successfully',
            product
        });
    } catch(error) {
        console.error('Error adding product offer:', error);
        res.status(500).json({
            message: 'Error adding product offer',
            error: error.message
        });
    }
};

const removeProductOffer = async(req,res)=>{
    try{
        const {productId} = req.params

        const product = await Product.findById(productId)
        if(!product){
            return res.status(404).json({
                messgae: 'Product not found' // Also fixed typo in 'message'
            })
        }

        product.offer = {
            percentage: 0,
            isActive: false,
        }

        await product.save()

        res.status(200).json({
            message: 'Product offer removed successfully',
            product
        })
    }catch(error){
        console.error('Error removing product offer: ', error)
        res.status(500).json({
            message: 'Error removing product offer',
            error: error.message
        })
    }
}


const addCategoryOffer = async (req, res) => {
    try {
        const { categoryId, percentage, startDate, endDate } = req.body;

        if (!categoryId || !percentage || !startDate || !endDate) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        if (percentage < 0 || percentage > 100) {
            return res.status(400).json({
                message: 'Percentage must be between 0 and 100'
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                message: 'Category not found'
            });
        }

        category.offer = {
            percentage,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: true
        };

        await category.save();

        res.status(200).json({
            message: 'Category offer added successfully',
            category
        });
    } catch (error) {
        console.error('Error adding category offer:', error);
        res.status(500).json({
            message: 'Error adding category offer',
            error: error.message
        });
    }
};

const removeCategoryOffer = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                message: 'Category not found'
            });
        }

        category.offer = {
            percentage: 0,
            isActive: false
        };

        await category.save();

        res.status(200).json({
            message: 'Category offer removed successfully',
            category
        });
    } catch (error) {
        console.error('Error removing category offer:', error);
        res.status(500).json({
            message: 'Error removing category offer',
            error: error.message
        });
    }
};



// getting all the active offer

const getAllOffers = async(req,res)=>{
    try{
        const productOffers = await Product.find({
            'offer.isActive': true
        }).select('productName offer')

        const categoryOffers = await Category.find({
            'offer.isActive': true
        }).select('categoryName offer')

        res.status(200).json({
            productOffers,
            categoryOffers
        })
    }catch(error){
        console.error('Error fetching offers: ', error)
        res.status(500).json({
            message: 'Error fetching offers',
            error: error.message
        })
    }
}




module.exports = {
    addProductOffer,
    removeProductOffer,
    addCategoryOffer,
    removeCategoryOffer,
    getAllOffers
}

