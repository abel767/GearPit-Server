const express = require('express')
const userRoute = express.Router()


const {verifyToken} = require('../../middleware/auth')
// user register and login contorller
const {signUp, verifyOTP, resendOTP, refreshTokenController, login ,logout, getUserData, checkBlockStatus} = require('../../controllers/User/userController')
// user profile controllers
const {getProfileData, updateUserProfile, changePassword, profileImageUpdate} = require('../../controllers/User/userDashboard')
// user addresses controller
const {addAddress, getAddresses, updateAddress, deleteAddress} = require('../../controllers/User/userAddressController')
// order controllers
const { createOrder, getOrderById, getOrders, getOrderStatus , cancelOrder } = require('../../controllers/Order/orderController');

// coupon controller
const {validateCoupon,applyCoupon,getValidCoupons } = require('../../controllers/User/userCouponController')

//block checking
userRoute.get('/check-block-status/:userId', checkBlockStatus);

// cart 
const { 
    addToCart, 
    getCart, 
    updateCartItem, 
    removeFromCart 
} = require('../../controllers/Cart/cartController');

// razor pay
const {createPaymentOrder, verifyPayment} = require('../../controllers/razorpay/razorpayController')

//wallet
const { 
    getWalletDetails, 
    addRefundToWallet 
} = require('../../controllers/wallet/walletController');

// wishlist
const { 
    getWishlist, 
    addToWishlist, 
    removeFromWishlist 
  } = require('../../controllers/wishlist/wishlistController');

// post methods
userRoute.post('/signup', signUp)
userRoute.post('/verifyOTP', verifyOTP)
userRoute.post('/resendOTP', resendOTP)
userRoute.post('/refresh-token', refreshTokenController)
userRoute.post('/login',login)
userRoute.post('/logout', logout)

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

// Order routes
userRoute.post('/orders', createOrder); 
userRoute.get('/orders/detail/:orderId',verifyToken, getOrderById);  // For getting single order
userRoute.get('/orders/user/:userId',verifyToken, getOrders);        // For getting user's orders
userRoute.put('/orders/:orderId/cancel',verifyToken, cancelOrder);
userRoute.get('/orders/:orderId/status',verifyToken, getOrderStatus); // Get current order status

//cart
userRoute.post('/cart/add',verifyToken, addToCart);
userRoute.get('/cart/:userId',verifyToken, getCart);
userRoute.put('/cart/update',verifyToken, updateCartItem);
userRoute.delete('/cart/remove/:userId/:productId/:variantId',verifyToken, removeFromCart);

//razor pay
userRoute.post('/create-payment',verifyToken, createPaymentOrder);
userRoute.post('/verify-payment',verifyToken, verifyPayment);

// counpon route
userRoute.post("/validate-coupon",verifyToken,validateCoupon);
userRoute.post('/apply-coupon',verifyToken, applyCoupon);
userRoute.get('/valid-coupons',verifyToken, getValidCoupons);


// wallet route
userRoute.get('/wallet/:userId',verifyToken, getWalletDetails);        // Get wallet details and transactions
userRoute.post('/wallet/refund',verifyToken, addRefundToWallet);       // Add refund to wallet


// wishlist
userRoute.get('/wishlist/:userId', verifyToken, getWishlist);
userRoute.post('/wishlist/add',verifyToken,  addToWishlist);
userRoute.delete('/wishlist/remove/:productId',verifyToken,removeFromWishlist);

module.exports = userRoute
