const express = require("express");
const passport = require("passport");
const authRoute = express.Router();


const protect = (req, res, next)=>{
    if(req.isAuthenticated()){
        return next()
    }
    res.status(401).json({
        error: true,
        message: "You must be logged in to access"
    })
}


authRoute.get('/google/callback',
    passport.authenticate('google',{
        successRedirect: 'http://localhost:5173/user/home',
        failureRedirect: 'http://localhost:5173/user/login'
    })
)

authRoute.get('/google',
    passport.authenticate('google',{
        scope: ['profile', 'email']
    })
)

authRoute.get('/login/failed', (req,res)=>{
    res.status(401).json({
        error: true,
        message: 'Log in failure'
    })
})


authRoute.get('/login/failed', (req,res)=>{
    res.status(401).json({
        error: true,
        message: 'Log in failure'
    })
})


authRoute.get('/login/success', (req,res)=>{
    if(req.user){
        res.status(200).json({
            error: false,
            message: 'Successfully logged in',
            user:{
                id: req.user._id,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                userName: req.user.userName,
                email: req.user.email,
                isGoogleUser: req.user.isGoogleUser
            }
        })
    }else{
        res.status(404).json({
            error: true,
            messaage: 'Not authorized'
        })
    }
})


authRoute.post("/logout", (req, res) => {
    try {
      // Use req.logout() with a callback to handle potential errors
      req.logout((err) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: "Logout failed"
          });
        }
        
        // Destroying  the session 
        req.session.destroy((destroyError) => {
          if (destroyError) {
            return res.status(500).json({
              error: true,
              message: "Session destruction failed"
            });
          }
          
          // Clearing the session cookie
          res.clearCookie('connect.sid'); 
          

          res.status(200).json({
            error: false,
            message: "Logout successful"
          });
        });
      });
    } catch (error) {
      res.status(500).json({
        error: true,
        message: "Logout error"
      });
    }
  });


  module.exports = authRoute