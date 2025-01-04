const User = require('../models/User/userModel')
const jwt = require('jsonwebtoken')
const checkIfBlocked = async (req, res, next) => {
    try{
        let userId;
        
        const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1]
        if(token){
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
            userId = decoded.userId

        }
        else if(req.user){
            userId = req.user.id
        }

        if(!userId){
            return next()
        }

        const user = await User.findById(userId)

        if(!user){
            clearAuthenticationData(req,res)
            return res.status(404).json({message: 'User not found'})
        }

        if(user.isBlocked){
            clearAuthenticationData(req,res)
            return res.status(403).json({
                status: 'BLOCKED',
                message: 'Your account has been blocked. Please contact support'
            })
        }

        next()
    }catch(error){
        console.error('CheckIfBlocked middleware error: ', error)
        return res.status(500).json({message: 'Internal server error'})
    }
   
};

const clearAuthenticationData = (req,res)=>{
    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    })

    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    })

    if(req.session){
        req.session.destroy((err)=>{
            if(err){
                console.error('Error destroying session', err)
            }
        })
    }

    if(req.session){
        req.session.destroy((err)=>{
            if(err){
                console.error('Error destroying session', err)
            }
        })
    }

    res.clearCookie('connect.sid')

}

module.exports = checkIfBlocked;
