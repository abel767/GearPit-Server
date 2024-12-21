const express =require("express")
const User = require("../../models/User/userModel")


const userCount = async(req,res)=>{
    try{
        const users = await User.find({ isAdmin: false });
        res.json(users.length)
    }catch(error){
        console.log(err);
        res.status(500).json({ error: "Failed to fetch users count in dashboard" });
    }
}


module.exports = {
    userCount
}