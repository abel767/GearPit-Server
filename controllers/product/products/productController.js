const Product = require('../../../models/Products/productModel');

const handleControllerError = (res, error, customMessage) => {
    console.error(`${customMessage} Error:`, error);
    res.status(500).json({
        message: customMessage,
        error: error.message,
    });
};

const calculateFinalPrice = (basePrice, variantDiscount = 0, productOffer = null) => {
    let finalPrice = basePrice;
    
    // Apply variant discount first
    if (variantDiscount > 0) {
        finalPrice *= (1 - variantDiscount / 100);
    }
    
    // Then apply product offer if exists and is active
    if (productOffer && productOffer.isActive && productOffer.percentage > 0) {
        finalPrice *= (1 - productOffer.percentage / 100);
    }
    
    return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
};

const getProductData = async(req, res) => {
    try {
        const products = await Product.find()
            .populate('category', 'categoryName offer')
            .lean();
        
        if(!products || products.length === 0) {
            return res.status(404).json({
                error: 'No products found'
            });
        }

        // Process products to include category offer information
        const processedProducts = products.map(product => {
            const variants = product.variants.map(variant => {
                // Recalculate final price considering both product and category offers
                const basePrice = variant.price;
                let finalPrice = basePrice;

                // Apply variant discount
                if (variant.discount > 0) {
                    finalPrice *= (1 - variant.discount / 100);
                }

                // Apply product offer if active
                if (product.offer && product.offer.isActive) {
                    finalPrice *= (1 - product.offer.percentage / 100);
                }

                // Apply category offer if active
                if (product.category.offer && product.category.offer.isActive) {
                    finalPrice *= (1 - product.category.offer.percentage / 100);
                }

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

        // Fetch category to check for category offer
        const categoryData = await Product.findById(category).select('offer');

        const processedVariants = variants.map(variant => {
            const basePrice = parseFloat(variant.price);
            const variantDiscount = parseFloat(variant.discount || 0);
            let finalPrice = calculateFinalPrice(basePrice, variantDiscount, offer);

            // Apply category offer if exists and is active
            if (categoryData && categoryData.offer && categoryData.offer.isActive) {
                finalPrice *= (1 - categoryData.offer.percentage / 100);
                finalPrice = Math.round(finalPrice * 100) / 100;
            }

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
        const categoryData = await Product.findById(updateData.category || existingProduct.category)
            .select('offer');

        const processedVariants = updateData.variants.map(variant => {
            const basePrice = parseFloat(variant.price);
            const variantDiscount = parseFloat(variant.discount || 0);
            let finalPrice = calculateFinalPrice(
                basePrice, 
                variantDiscount, 
                updateData.offer || existingProduct.offer
            );

            // Apply category offer if exists and is active
            if (categoryData && categoryData.offer && categoryData.offer.isActive) {
                finalPrice *= (1 - categoryData.offer.percentage / 100);
                finalPrice = Math.round(finalPrice * 100) / 100;
            }

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

module.exports = {
    getProductData,
    addProduct,
    toggleProductStatus,
    editProduct
};