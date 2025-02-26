const express = require('express')
const userRoute = express.Router()


const {verifyToken} = require('../../middleware/auth')
// user register and login contorller
const {signUp, verifyOTP, resendOTP, refreshTokenController, login ,logout, getUserData, checkBlockStatus} = require('../../controllers/User/userController')
// user profile controllers
const {getProfileData, updateUserProfile, changePassword, profileImageUpdate} = require('../../controllers/User/userDashboard')
//banner controller 
const {getActiveBanners} = require('../../controllers/Admin/bannerController')
// user addresses controller
const {addAddress, getAddresses, updateAddress, deleteAddress} = require('../../controllers/User/userAddressController')

// stock validation middleware
const {validateStock} = require('../../middleware/stockValidationController')
// order controllers
const { createOrder, getOrderById, getOrders, getOrderStatus , cancelOrder,getOrderByRazorpayId } = require('../../controllers/Order/orderController');

// coupon controller
const {validateCoupon,applyCoupon,getValidCoupons } = require('../../controllers/User/userCouponController')

//block checking
userRoute.get('/check-block-status/:userId', checkBlockStatus);

// cart 
const { 
    addToCart, 
    getCart, 
    updateCartItem, 
    removeFromCart,
    clearCart
} = require('../../controllers/Cart/cartController');

// razor pay
const { 
    retryPayment, 
    verifyRetryPayment,
    createPaymentOrder, 
    verifyPayment, 
    handlePaymentFailure 
} = require('../../controllers/razorpay/razorpayController');

//wallet
const { 
    getWalletDetails, 
    addRefundToWallet ,
    processWalletPayment
} = require('../../controllers/wallet/walletController');

// wishlist
const { 
    getWishlist, 
    addToWishlist, 
    removeFromWishlist 
  } = require('../../controllers/wishlist/wishlistController');


// invoice controller
const {generateInvoice } =require('../../controllers/invoice pdf/invoicePDF')

//search engine
const {searchProducts} = require('../../controllers/product/products/productController')

// const { validateStock } = require('../../middleware/stockValidateController');


// post methods
userRoute.post('/signup', signUp)
userRoute.post('/verifyOTP', verifyOTP)
userRoute.post('/resendOTP', resendOTP)
userRoute.post('/refresh-token', refreshTokenController)
userRoute.post('/login',login)

userRoute.post('/logout',verifyToken, logout)

//banner route
userRoute.get('/banners',getActiveBanners)

// user data route
userRoute.get('/getuserdata/:id',getUserData)

// profile routes 
userRoute.get('/profile/:id',verifyToken, getProfileData)

userRoute.put('/profileupdate/:id',verifyToken, updateUserProfile)
userRoute.put('/change-password/:id',verifyToken, changePassword)
userRoute.put('/profileImageupdate/:id', verifyToken, profileImageUpdate)

// address routes
userRoute.post('/address/:id',verifyToken, addAddress)
userRoute.get('/address/:id',verifyToken, getAddresses)
userRoute.put('/address/:id/:addressId',verifyToken, updateAddress)
userRoute.delete('/address/:id/:addressId',verifyToken, deleteAddress)

// userRoute.post('/products/validate-stock', verifyToken, validateStock);

//razor pay

userRoute.post('/payment-failure', verifyToken, handlePaymentFailure);
userRoute.post('/orders/:orderId/retry-payment', verifyToken, retryPayment);
userRoute.post('/create-payment',verifyToken, createPaymentOrder);
userRoute.post('/verify-payment',verifyToken, verifyPayment);
userRoute.post('/verify-retry-payment',verifyToken,verifyRetryPayment )

//validate stock
userRoute.post('/validate-stock', verifyToken, validateStock)

// Order routes
userRoute.post('/orders', verifyToken, createOrder); 
userRoute.get('/orders/detail/:orderId',verifyToken, getOrderById);  
userRoute.get('/orders/user/:userId',verifyToken, getOrders);        
userRoute.put('/orders/:orderId/cancel',verifyToken, cancelOrder);
userRoute.get('/orders/:orderId/status',verifyToken, getOrderStatus); 
userRoute.post('/orders/:orderId/retry-payment', verifyToken, retryPayment);
userRoute.get('/orders/razorpay/:razorpayOrderId', verifyToken, getOrderByRazorpayId);

//cart
userRoute.post('/cart/add',verifyToken, addToCart);
userRoute.get('/cart/:userId',verifyToken, getCart);
userRoute.put('/cart/update',verifyToken, updateCartItem);
userRoute.delete('/cart/remove/:userId/:productId/:variantId',verifyToken, removeFromCart);
userRoute.delete('/cart/clear/:userId', verifyToken, clearCart);

// counpon route
userRoute.post("/validate-coupon",verifyToken,validateCoupon);
userRoute.post('/apply-coupon',verifyToken, applyCoupon);
userRoute.get('/valid-coupons',verifyToken, getValidCoupons);


// wallet route
userRoute.get('/wallet/:userId',verifyToken, getWalletDetails);        
userRoute.post('/wallet/refund',verifyToken, addRefundToWallet);       
userRoute.post('/wallet/payment', verifyToken, processWalletPayment); 

// wishlist
userRoute.get('/wishlist/:userId', verifyToken, getWishlist);
userRoute.post('/wishlist/add',verifyToken,  addToWishlist);
userRoute.delete('/wishlist/remove/:productId',verifyToken,removeFromWishlist);

//invoice pdf router
userRoute.get('/orders/invoice/:orderId',verifyToken, generateInvoice)

// search 
userRoute.get('/search', searchProducts);

module.exports = userRoute