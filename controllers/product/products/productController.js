const Product = require('../../../models/Products/productModel')

const handleControllerError = (res, error, customMessage) => {
    console.error(`${customMessage} Error:`, error)
    res.status(500).json({
        message: customMessage,
        error: error.message,
    })
}

const getProductData = async(req, res) => {
    try {
        const products = await Product.find()
            .populate('category', 'categoryName')
            .lean()
        
        if(!products || products.length === 0) {
            return res.status(404).json({
                error: 'No products found'
            })
        }

        return res.status(200).json(products)
    } catch(error) {
        console.error('Detailed Product Fetch Error: ', error)
        return res.status(500).json({
            error: 'Failed to fetch products',
            details: error.message,
            stack: error.stack
        })
    }
}

const addProduct = async(req, res) => {
    try {
        console.log(`Received request body: `, JSON.stringify(req.body, null, 2))
        const {
            productName,
            category,
            type,
            brand,
            description,
            variants,
            images
        } = req.body

        if(!variants || !Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({
                message: 'At least one variant is required',
                receivedVariants: variants
            })
        }

        // Process variants with discount and final price calculations
        const processedVariants = variants.map(variant => ({
            size: variant.size,
            price: parseFloat(variant.price),
            discount: parseFloat(variant.discount || 0),
            finalPrice: parseFloat(variant.price) * (1 - parseFloat(variant.discount || 0) / 100),
            stock: parseInt(variant.stock)
        }))

        const newProduct = await Product.create({
            productName,
            category,
            type,
            brand: brand || undefined,
            description: description || null,
            images: images || [],
            variants: processedVariants
        })

        await newProduct.save()
        console.log('Product saved successfully: ', newProduct)
        res.status(201).json({
            message: 'Product added successfully',
            product: newProduct
        })
    } catch(error) {
        if(error.code === 11000) {
            return res.status(409).json({
                message: 'Product already exists',
            })
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation Error',
                errors: Object.values(error.errors).map(err => err.message)
            })
        }
        
        handleControllerError(res, error, 'Failed to add product')
    }
}

const softDeleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        if (!productId) {
            return res.status(400).json({ message: "Product ID is required" });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { isDeleted: true },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({
            message: "Product soft-deleted successfully",
            product: updatedProduct,
        });
    } catch (error) {
        handleControllerError(res, error, "Error soft-deleting product")
    }
}

const editProduct = async(req, res) => {
    try {
        const { id } = req.params
        const updateData = req.body

        if(!id) {
            return res.status(400).json({message: 'Product ID is required'})
        }

        const existingProduct = await Product.findById(id)
        if(!existingProduct) {
            return res.status(404).json({message: 'Product not found'})
        }

        // Process variants with discount and final price calculations for update
        const processedVariants = updateData.variants.map(variant => ({
            size: variant.size,
            price: parseFloat(variant.price),
            discount: parseFloat(variant.discount || 0),
            finalPrice: parseFloat(variant.price) * (1 - parseFloat(variant.discount || 0) / 100),
            stock: parseInt(variant.stock)
        }))

        const updateObject = {
            productName: updateData.productName,
            category: updateData.category,
            type: updateData.type || existingProduct.type,
            brand: updateData.brand || existingProduct.brand,
            description: updateData.description || existingProduct.description,
            images: updateData.images || existingProduct.images,
            variants: processedVariants,
            updatedAt: new Date()
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            updateObject,
            {
                new: true,
                runValidators: true
            }
        )

        if(!updatedProduct) {
            return res.status(404).json({message: 'Product not found'})
        }

        res.status(200).json({
            message: 'Product updated successfully',
            product: updatedProduct
        })
    } catch(error) {
        handleControllerError(res, error, 'Error updating product')
    }
}

module.exports = {
    getProductData,
    addProduct,
    softDeleteProduct,
    editProduct
}