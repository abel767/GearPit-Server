const Category = require('../../../models/Products/categoryModel')

const categoryData = async(req,res)=>{
    try{
        const data = await Category.find()
        res.status(200).json(data)
    }catch(error){
        console.error('Category fetch error: ', error)
        return res.status(500).json({
            error: 'Failed to fetch Category',
            details: error.message
        })
    }
}

const addCategoryData = async(req,res)=>{
    try{
        const {categoryName, description, isActive} = req.body

        if(!categoryName){
            return res.status(400).json({
                message: 'Category name is requyired'
            })
        }

        const existingCategory = await Category.findOne({categoryName: categoryName.trim()})
        if(existingCategory){
            return res.status(400).json({
                message: 'Category already exists'
            })
        }
        const newCategory = new Category({
            categoryName: categoryName.trim(),
            description: description ? description.trim() : '',
            isActive: isActive !== undefined ? isActive : true
        })

        const savedCategory = await newCategory.save()

        res.status(201).json({
            message: 'Category created successfully',
            category: savedCategory
        })
    }catch(error){
        console.error('Category creation error:', error);
        res.status(500).json({ 
          message: 'Error creating category', 
          error: error.message 
        });
    }
}

const categoryStatus = async(req,res)=>{
    try{
        const {id} = req.params
        const {isActive} = req.body
        const updatedCategory = await Category.findByIdAndUpdate(id, 
            {isActive: isActive},
            {new: true}
        )
        if(!updatedCategory){
            return res.status(404).json({
                message: 'Category not found'
            })
        }
        res.status(200).json(updatedCategory)
    }catch(error){
        console.error('Category status update error:', error);
        res.status(500).json({
            message: 'Error updating category status || server error',
            error: error.message
        })
    }
}

const categoryEdit = async(req,res)=>{P
    try{
        const {id} = req.params
        const {categoryName, description} = req.body 
        

        if(!categoryName || categoryName.trim() === ''){
            return res.status(400).json({
                message: 'Category name is required'
            })
        }

        const existingCategory = await  Category.findOne({
            categoryName: categoryName,
            _id: {$ne: id}
        })

        if(existingCategory) {
            return res.status(409).json({
                message: 'Category name already exists'
            })
        }

        const updatedCategory = await Category.findByIdAmdUpdate(
            id,
            {
                categoryName: categoryName,
                description: description ? description.trim() : '',
                updatedAt: new Date()
            },
            {
                new: true,
                runValidators: true
            }
        )

        if(!updatedCategory){
            return res.status(404).json({
                message: 'Category not found'
            })
        }

        res.status(200).json(updatedCategory)

        
    }catch(error){
        console.error('Error updating category', error)
    }

    if(error.name === 'validationError'){
        return res.status(400).json({
            message: 'validation Error',
            errors: Object.values(error.errors).map(err=> err.message)
        })
    }

    res.status(500).json({
        message: 'server error',
        error: error.message
    })
}


const categoryDataForAddProduct = async(req,res)=>{
    try{
        const activeCategories = await Category.find({
            isActive: true
        },{
            _id: 1,
            categoryName: 1,
        }).sort({categoryName: 1})


        if(activeCategories.length === 0){
            return res.staus(404).json({
                message: 'No active categories found',
                Categories: []
            })
        }

        res.statsu(200).json({activeCategories})
    }catch(error){
          console.error('Error fetching active categories', error)
          res.status(500).json({
            message: 'Server error',
            error: error.message
          })
    }

}

module.exports ={
    categoryData,
    addCategoryData,
    categoryStatus,
    categoryDataForAddProduct,
    categoryEdit
}
