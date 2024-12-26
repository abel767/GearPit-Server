const express = require("express")
const adminRoute = express.Router()
const {adminLogin,getUserData,isBlock,} = require("../../controllers/Admin/adminController")
const {cloudinaryImageUpload} = require("../../controllers/cloudinary/cloudinaryController")
const {userCount} = require("../../controllers/Admin/dashboardController")
// product and category
const {getProductData,addProduct,softDeleteProduct,editProduct} = require("../../controllers/product/products/productController")
const {categoryData,addCategoryData,categoryStatus,categoryEdit,categoryDataForAddProduct} = require('../../controllers/product/Category/categoryController')
//post methods
adminRoute.post('/login', adminLogin)


//get methods
adminRoute.get('/data', getUserData)
adminRoute.get('/user-count', userCount)
adminRoute.get('/generate-upload-url',cloudinaryImageUpload);
// category get 
adminRoute.get('/categorydata',categoryData);
adminRoute.post('/addcategorydata',addCategoryData);
adminRoute.put('/categorystatus/:id',categoryStatus);
adminRoute.put('/editcategory/:id',categoryEdit);
adminRoute.get('/categorydata-addproduct',categoryDataForAddProduct);

//product  methods
adminRoute.get('/productdata',getProductData);
adminRoute.post('/addproduct',addProduct);
adminRoute.put('/editproduct/:id',editProduct);
adminRoute.put('/softdeleteproduct/:id',softDeleteProduct);

// put methods
adminRoute.put('/block/:id', isBlock)
adminRoute.put('/block/:id',isBlock);




module.exports = adminRoute