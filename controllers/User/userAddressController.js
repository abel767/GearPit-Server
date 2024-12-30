const User = require('../../models/User/userModel')

const addAddress = async(req,res)=>{
    try{
        const {id} = req.params;
        const addressData = req.body
    
        const user = await User.findById(id)
        if(!user){
            return res.status(404).json({
                success: false,
                message: 'User not found'
            })
        }
    
        if(user.addresses && user.addresses.length >=5){
            return res.status(400).json({
                success: false,
                message: 'You can add only 5 addresses'
            })
        }
    
        user.addresses.push(addressData)
        await user.save()
    
        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            data: user.addresses
        })
    }catch(error){
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        })
    }
    
}


const getAddresses = async(req,res)=>{
    try{
        const {id} = req.params
        const user = await User.findById(id)

        if(!user){
            return res.status(404).json({
                success: false,
                message: 'User not found'
            })
        }

        res.status(200).json({
            success: true,
            addresses: user.addresses || []
        })
    }catch(error){
        res.status(500).json({
            success: false,
            message: 'Error fetching addresses',
            error: error.message
        })
    }
}

const updateAddress = async(req,res)=>{

    try{
        const {id, addressId} = req.params
        const updateData = req.body

        const user = await User.findOneAndUpdate(
            {
                _id:id,
                'addresses._id': addressId
            },
            {
                $set: { 'addresses.$': updateData }         
            },
            {
                new: true,
                runvalidators: true
            }
        )

        if(!user){
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            })
        }

        res.status(200).json({
            success: true,
            message: 'Address updated succesfully',
            addresses: user.addresses
        })
    }catch(error){
         res.status(500).json({
            success: false,
            message: 'Error updating address',
            error: error.message
         })
    }

}


const deleteAddress = async(req,res)=>{
    try{
        const {id, addressId} = req.params
        const user = await User.findByIdAndUpdate(
            id,
            {
                $pull: {addresses: {_id:addressId}}
            },
            {
                new:true
            }
        )

        if(!user){
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            })
        }

        res.status(200).json({
            success: true,
            message: 'Address deleted succesfully',
            addresses: user.addresses

        })
    }catch(error){
        res.status(500).json({
            success: false,
            message: 'Error deleting address',
            error: error.message
        })
    }
}

module.exports ={
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress
}