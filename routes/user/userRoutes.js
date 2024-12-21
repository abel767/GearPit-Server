const express = require('express')
const userRoute = express.Router()
const {signUp, verifyOTP, resendOTP, refreshTokenController, login , getUserData} = require('../../controllers/User/userController')
const {getProfileData, updateUserProfile, changePassword, profileImageUpdate} = require('../../controllers/User/userDashboard')
// post methods
userRoute.post('/signup', signUp)
userRoute.post('/verifyOTP', verifyOTP)
userRoute.post('/resendOTP', resendOTP)
userRoute.post('/refresh-token', refreshTokenController)
userRoute.post('/login',login)


// get methods
userRoute.get('/getuserdata/:id',getUserData)
userRoute.get('/profile/:id', getProfileData)

//put methods
userRoute.put('/profileupdate/:id', updateUserProfile)
userRoute.put('/change-password/:id', changePassword)
userRoute.put('/profileImageupdate/:id', profileImageUpdate)

module.exports = userRoute