const express = require("express");
const adminRoute = express.Router();

const {
  adminLogin,
  getUserData,
  isBlock,
  adminLogout
} = require("../../controllers/Admin/adminController");

const { cloudinaryImageUpload } = require("../../controllers/cloudinary/cloudinaryController");
const { userCount } = require("../../controllers/Admin/dashboardController");

// Product and Category controllers
const {
  getProductData,
  addProduct,
  toggleProductStatus,
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

const {
    getAllOrders,
    updateOrderStatus,
    getOrderStats
  } = require("../../controllers/Admin/adminOrderController");

// Admin authentication
adminRoute.post("/login", adminLogin);
adminRoute.post("/logout", adminLogout);

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
adminRoute.put("/toggleproductstatus/:id", toggleProductStatus); 

// order routes
// Order routes
adminRoute.get("/orders", getAllOrders);
adminRoute.patch("/orders/:orderId/status", updateOrderStatus);
adminRoute.get("/order-stats", getOrderStats);

module.exports = adminRoute;
