const express = require('express')
const userRoute = express.Router()
// user register and login contorller
const {signUp, verifyOTP, resendOTP, refreshTokenController, login ,logout, getUserData} = require('../../controllers/User/userController')
// user profile controllers
const {getProfileData, updateUserProfile, changePassword, profileImageUpdate} = require('../../controllers/User/userDashboard')
// user addresses controller
const {addAddress, getAddresses, updateAddress, deleteAddress} = require('../../controllers/User/userAddressController')

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

module.exports = userRoute

