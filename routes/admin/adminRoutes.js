const express = require("express")
const adminRoute = express.Router()
const {adminLogin,getUserData,isBlock,} = require("../../controllers/Admin/adminController")
const {cloudinaryImageUpload} = require("../../controllers/cloudinary/cloudinaryController")
const {userCount} = require("../../controllers/Admin/dashboardController")

//post methods
adminRoute.post('/login', adminLogin)


//get methods
adminRoute.get('/data', getUserData)
adminRoute.get('/user-count', userCount)
adminRoute.get('/generate-upload-url',cloudinaryImageUpload);


// put methods
adminRoute.put('/block/:id', isBlock)



module.exports = adminRoute