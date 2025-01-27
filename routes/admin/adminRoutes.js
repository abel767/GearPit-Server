const express = require("express");
const adminRoute = express.Router();
const {verifyAdmin} = require('../../middleware/auth')
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


// sales analytics
const {
  getTodayAnalytics,
  getRevenueData,
  getMostSoldCategories
} = require("../../controllers/Admin/salesAnalyticController");


// coupon admin side
const {
  createCoupon,
  getAllCoupons,
  toggleCouponStatus,
  deleteCoupon
} = require("../../controllers/Admin/couponController");

//offers
const {
  addProductOffer,
  removeProductOffer,
  addCategoryOffer,
  removeCategoryOffer,
  getAllOffers
} = require("../../controllers/Admin/offerController");

// sales report
const{
  getSalesReport,
    downloadExcelReport,
    downloadPdfReport
} = require('../../controllers/Admin/salesReportController')


// Admin authentication
adminRoute.post("/login", adminLogin);
adminRoute.post("/logout",verifyAdmin, adminLogout);

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

// Order routes
adminRoute.get("/orders", getAllOrders);
adminRoute.patch("/orders/:orderId/status", updateOrderStatus);
adminRoute.get("/order-stats", getOrderStats);

// sales route
adminRoute.get("/sales/today-analytics", getTodayAnalytics);
adminRoute.get("/sales/revenue", getRevenueData);
adminRoute.get("/sales/most-sold-categories", getMostSoldCategories);

// Sales report routes
adminRoute.get("/sales/report", getSalesReport);
adminRoute.get("/sales/report/excel", downloadExcelReport);
adminRoute.get("/sales/report/pdf", downloadPdfReport);

// coupon route
adminRoute.post("/coupons", createCoupon);
adminRoute.get("/coupons", getAllCoupons);
adminRoute.put("/coupons/:id/toggle", toggleCouponStatus);
adminRoute.delete("/coupons/:id", deleteCoupon);

// Offer routes
adminRoute.post("/product-offer", addProductOffer);
adminRoute.delete("/product-offer/:productId", removeProductOffer);
adminRoute.post("/category-offer", addCategoryOffer);
adminRoute.delete("/category-offer/:categoryId", removeCategoryOffer);
adminRoute.get("/offers", getAllOffers);


module.exports = adminRoute;
