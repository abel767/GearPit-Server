const Product = require('../../../models/Products/productModel');
const Category = require('../../../models/Products/categoryModel')
const handleControllerError = (res, error, customMessage) => {
    console.error(`${customMessage} Error:`, error);
    res.status(500).json({
        message: customMessage,
        error: error.message,
    });
};

const calculateFinalPrice = (basePrice, variantDiscount = 0, productOffer = null, categoryOffer = null) => {
    let finalPrice = basePrice;
    let highestDiscountPercentage = 0;

    // Check variant discount
    if (variantDiscount > 0) {
        highestDiscountPercentage = Math.max(highestDiscountPercentage, variantDiscount);
    }

    // Check product offer
    if (productOffer && productOffer.isActive && productOffer.percentage > 0) {
        highestDiscountPercentage = Math.max(highestDiscountPercentage, productOffer.percentage);
    }

    // Check category offer
    if (categoryOffer && categoryOffer.isActive && categoryOffer.percentage > 0) {
        highestDiscountPercentage = Math.max(highestDiscountPercentage, categoryOffer.percentage);
    }

    // Apply the highest discount
    finalPrice *= (1 - highestDiscountPercentage / 100);
    
    return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
};



const getProductData = async(req, res) => {
    try {
        // Fetch products with category information
        const products = await Product.find()
            .populate('category', 'categoryName offer')
            .lean();
        
        if(!products || products.length === 0) {
            return res.status(404).json({
                error: 'No products found'
            });
        }

        // Process each product to include final prices with all applicable discounts
        const processedProducts = products.map(product => {
            const variants = product.variants.map(variant => {
                const basePrice = variant.price;
                let finalPrice = basePrice;
                let highestDiscountPercentage = 0;

                if (variant.discount > 0) {
                    highestDiscountPercentage = Math.max(highestDiscountPercentage, variant.discount);
                }
            
                // Check product offer
                if (product.offer && product.offer.isActive) {
                    highestDiscountPercentage = Math.max(highestDiscountPercentage, product.offer.percentage);
                }
            
                // Check category offer
                if (product.category.offer && product.category.offer.isActive) {
                    highestDiscountPercentage = Math.max(highestDiscountPercentage, product.category.offer.percentage);
                }
            
                // Apply the highest discount
                finalPrice *= (1 - highestDiscountPercentage / 100);

                return {
                    ...variant,
                    finalPrice: Math.round(finalPrice * 100) / 100
                };
            });

            return {
                ...product,
                variants,
                isBlocked: product.isBlocked ?? false
            };
        });

        return res.status(200).json(processedProducts);
    } catch(error) {
        console.error('Detailed error in getProductData:', {
            message: error.message,
            stack: error.stack
        });
        return res.status(500).json({
            error: 'Failed to fetch products',
            details: error.message
        });
    }
};


const addProduct = async(req, res) => {
    try {
        console.log(`Received request body: `, JSON.stringify(req.body, null, 2));
        const {
            productName,
            category,
            type,
            brand,
            description,
            variants,
            images,
            offer
        } = req.body;

        if(!variants || !Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({
                message: 'At least one variant is required',
                receivedVariants: variants
            });
        }

        // CRITICAL ERROR: Using Product model instead of Category model
        // Should be:
        // const categoryData = await Category.findById(category).select('offer');
        const categoryData = await Category.findById(category).select('offer');

        const processedVariants = variants.map(variant => {
            const basePrice = parseFloat(variant.price);
            const variantDiscount = parseFloat(variant.discount || 0);
            
            const finalPrice = calculateFinalPrice(
                basePrice, 
                variantDiscount, 
                offer, 
                categoryData?.offer
            );

            return {
                size: variant.size,
                price: basePrice,
                discount: variantDiscount || 0,
                finalPrice,
                stock: parseInt(variant.stock)
            };
        });

        const newProduct = await Product.create({
            productName,
            category,
            type,
            brand: brand || undefined,
            description: description || null,
            images: images || [],
            variants: processedVariants,
            offer: offer || {
                percentage: 0,
                isActive: false
            },
            isBlocked: false
        });

        console.log('New product created:', newProduct);
        res.status(201).json({
            message: 'Product added successfully',
            product: newProduct
        });
    } catch(error) {
        if(error.code === 11000) {
            return res.status(409).json({
                message: 'Product already exists',
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation Error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        handleControllerError(res, error, 'Failed to add product');
    }
};

const editProduct = async(req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if(!id) {
            return res.status(400).json({message: 'Product ID is required'});
        }

        const existingProduct = await Product.findById(id);
        if(!existingProduct) {
            return res.status(404).json({message: 'Product not found'});
        }

        // Fetch category to check for category offer
        const categoryData = await Category.findById(updateData.category || existingProduct.category)
            .select('offer');

        const processedVariants = updateData.variants.map(variant => {
            const basePrice = parseFloat(variant.price);
            const variantDiscount = parseFloat(variant.discount || 0);
            
            const finalPrice = calculateFinalPrice(
                basePrice, 
                variantDiscount, 
                updateData.offer || existingProduct.offer, 
                categoryData?.offer
            );

            return {
                size: variant.size,
                price: basePrice,
                discount: variantDiscount,
                finalPrice,
                stock: parseInt(variant.stock)
            };
        });

        const updateObject = {
            productName: updateData.productName,
            category: updateData.category,
            type: updateData.type || existingProduct.type,
            brand: updateData.brand || existingProduct.brand,
            description: updateData.description || existingProduct.description,
            images: updateData.images || existingProduct.images,
            variants: processedVariants,
            offer: updateData.offer || existingProduct.offer,
            updatedAt: new Date()
        };

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            updateObject,
            {
                new: true,
                runValidators: true
            }
        );

        if(!updatedProduct) {
            return res.status(404).json({message: 'Product not found'});
        }

        res.status(200).json({
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch(error) {
        handleControllerError(res, error, 'Error updating product');
    }
};

const toggleProductStatus = async (req, res) => {
    try {
        const productId = req.params.id;

        if (!productId) {
            return res.status(400).json({ message: "Product ID is required" });
        }

        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { isBlocked: !product.isBlocked },
            { new: true }
        );

        const statusMessage = updatedProduct.isBlocked ? 'blocked' : 'unblocked';
        
        res.status(200).json({
            message: `Product ${statusMessage} successfully`,
            product: updatedProduct,
        });
    } catch (error) {
        handleControllerError(res, error, "Error updating product status");
    }
};


const searchProducts = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ 
                message: 'Search query is required'
            });
        }

        // Create search pipeline with category population
        const searchPipeline = [
            {
                $match: {
                    $and: [
                        { isBlocked: false },
                        {
                            $or: [
                                { productName: { $regex: query, $options: 'i' } },
                                { description: { $regex: query, $options: 'i' } },
                                { brand: { $regex: query, $options: 'i' } }
                            ]
                        }
                    ]
                }
            },
            // Populate category data
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: {
                    path: '$category',
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        const products = await Product.aggregate(searchPipeline);

        // Process products to include final prices (using your existing calculateFinalPrice function)
        const processedProducts = products.map(product => {
            const variants = product.variants.map(variant => {
                const basePrice = variant.price;
                const finalPrice = calculateFinalPrice(
                    basePrice,
                    variant.discount,
                    product.offer,
                    product.category?.offer
                );

                return {
                    ...variant,
                    finalPrice
                };
            });

            return {
                ...product,
                variants
            };
        });

        return res.status(200).json({
            success: true,
            products: processedProducts,
            count: processedProducts.length
        });

    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({
            message: 'Failed to search products',
            error: error.message
        });
    }
};

module.exports = {
    getProductData,
    addProduct,
    toggleProductStatus,
    editProduct,
    searchProducts
};