const express = require("express");
const adminRoute = express.Router();

const {
  adminLogin,
  getUserData,
  isBlock,
} = require("../../controllers/Admin/adminController");

const { cloudinaryImageUpload } = require("../../controllers/cloudinary/cloudinaryController");
const { userCount } = require("../../controllers/Admin/dashboardController");

// Product and Category controllers
const {
  getProductData,
  addProduct,
  softDeleteProduct,
  editProduct,
} = require("../../controllers/product/products/productController");

const {
  categoryData,
  addCategoryData,
  categoryStatus,
  categoryEdit,
  categoryDataForAddProduct,
  deleteCategoryData, 
  getCategoryById
} = require("../../controllers/product/Category/categoryController");

// Admin authentication
adminRoute.post("/login", adminLogin);

// User management
adminRoute.get("/data", getUserData);
adminRoute.get("/user-count", userCount);
adminRoute.put("/block/:id", isBlock);

// Cloudinary
adminRoute.get("/generate-upload-url", cloudinaryImageUpload);

// Category routes
adminRoute.get("/categorydata", categoryData);
adminRoute.post("/addcategorydata", addCategoryData);
adminRoute.put("/categorystatus/:id", categoryStatus);
adminRoute.put("/editcategory/:id", categoryEdit);
adminRoute.get("/categorydata-addproduct", categoryDataForAddProduct);
adminRoute.get('/categorydata/:id', getCategoryById)

// Product routes
adminRoute.get("/productdata", getProductData);
adminRoute.post("/addproduct", addProduct);
adminRoute.put("/editproduct/:id", editProduct);
adminRoute.put("/softdeleteproduct/:id", softDeleteProduct);

module.exports = adminRoute;
