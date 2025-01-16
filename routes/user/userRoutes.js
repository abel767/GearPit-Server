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
userRoute.get('/profile/:id', getProfileData)
userRoute.put('/profileupdate/:id', updateUserProfile)
userRoute.put('/change-password/:id', changePassword)
userRoute.put('/profileImageupdate/:id', profileImageUpdate)

// address routes
userRoute.post('/address/:id',addAddress)
userRoute.get('/address/:id', getAddresses)
userRoute.put('/address/:id/:addressId', updateAddress)
userRoute.delete('/address/:id/:addressId', deleteAddress)

// Order routes
userRoute.post('/orders', createOrder); 
userRoute.get('/orders/detail/:orderId', getOrderById);  // For getting single order
userRoute.get('/orders/user/:userId', getOrders);        // For getting user's orders
userRoute.put('/orders/:orderId/cancel', cancelOrder);
userRoute.get('/orders/:orderId/status', getOrderStatus); // Get current order status

//cart
userRoute.post('/cart/add', addToCart);
userRoute.get('/cart/:userId', getCart);
userRoute.put('/cart/update', updateCartItem);
userRoute.delete('/cart/remove/:userId/:productId/:variantId', removeFromCart);

//razor pay
userRoute.post('/create-payment', createPaymentOrder);
userRoute.post('/verify-payment', verifyPayment);

// counpon route
userRoute.post("/validate-coupon",validateCoupon);
userRoute.post('/apply-coupon', applyCoupon);
userRoute.get('/valid-coupons', getValidCoupons);


// wallet route
userRoute.get('/wallet/:userId', getWalletDetails);        // Get wallet details and transactions
userRoute.post('/wallet/refund', addRefundToWallet);       // Add refund to wallet


// wishlist
userRoute.get('/wishlist/:userId',  getWishlist);
userRoute.post('/wishlist/add',  addToWishlist);
userRoute.delete('/wishlist/remove/:productId',removeFromWishlist);

module.exports = userRoute
