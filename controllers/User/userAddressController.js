const User = require('../../models/User/userModel')

const addAddress = async(req,res)=>{
    try{
        const {id} = req.params;
        const addressData = req.body

        console.log('Received address data:', addressData);
        console.log('User ID:', id);

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
        const requiredFields = ['firstName', 'lastName', 'address', 'city', 'state', 'country', 'pincode', 'phoneNumber'];
        const missingFields = requiredFields.filter(field => !addressData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const newAddress = {
            firstName: addressData.firstName.trim(),
            lastName: addressData.lastName.trim(),
            address: addressData.address.trim(),
            city: addressData.city.trim(),
            state: addressData.state.trim(),
            country: addressData.country.trim(),
            pincode: addressData.pincode.trim(),
            phoneNumber: addressData.phoneNumber.trim()
        };
    
        user.addresses.push(newAddress)  // Use the sanitized newAddress object
        await user.save()

        console.log('Updated addresses:', user.addresses);
    
        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            data: {
                addresses: user.addresses  // Match the expected format
            }
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
            data: {
                addresses: user.addresses || []  // Match the expected format
            }
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
                runValidators: true  // Fixed typo in runValidators
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
            message: 'Address updated successfully',
            data: {
                addresses: user.addresses  // Match the expected format
            }
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
                new: true
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
            message: 'Address deleted successfully',
            data: {
                addresses: user.addresses  // Match the expected format
            }
        })
    }catch(error){
        res.status(500).json({
            success: false,
            message: 'Error deleting address',
            error: error.message
        })
    }
}

module.exports = {
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress
}