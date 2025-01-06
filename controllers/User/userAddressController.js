const User = require('../../models/User/userModel');
const mongoose = require('mongoose');

const addAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const addressData = req.body;

        console.log('Adding address for user ID:', id);
        console.log('Address data received:', addressData);


        // Validate user ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const user = await User.findById(id);
        console.log('User before update:', user);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Initialize addresses array if it doesn't exist
        if (!user.addresses) {
            user.addresses = [];
        }

        // Check address limit
        if (user.addresses.length >= 5) {
            return res.status(400).json({
                success: false,
                message: 'You can add only 5 addresses'
            });
        }

        // Validate and sanitize address data
        const newAddress = {
            firstName: addressData.firstName.trim(),
            lastName: addressData.lastName.trim(),
            address: addressData.address.trim(),
            country: addressData.country.trim(),
            state: addressData.state.trim(),
            city: addressData.city.trim(),
            pincode: addressData.pincode.trim(),
            phoneNumber: addressData.phoneNumber.trim()
        };

        // Add new address
        user.addresses.push(newAddress);
        await user.save();
        console.log('User after update:', user);

        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            addresses: user.addresses
        });

        console.log('Received address data:', addressData);
        console.log('User before update:', user);
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });

        
    }

};

const updateAddress = async (req, res) => {
    try {
        const { id, addressId } = req.params;
        const updateData = req.body;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }

        // Validate required fields
        const requiredFields = ['firstName', 'lastName', 'address', 'city', 'state', 'country', 'pincode', 'phoneNumber'];
        const missingFields = requiredFields.filter(field => !updateData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Sanitize update data
        const sanitizedUpdateData = {
            firstName: updateData.firstName.trim(),
            lastName: updateData.lastName.trim(),
            address: updateData.address.trim(),
            city: updateData.city.trim(),
            state: updateData.state.trim(),
            country: updateData.country.trim(),
            pincode: updateData.pincode.trim(),
            phoneNumber: updateData.phoneNumber.trim()
        };

        const user = await User.findOneAndUpdate(
            {
                _id: id,
                'addresses._id': addressId
            },
            {
                $set: { 'addresses.$': sanitizedUpdateData }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User or address not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Address updated successfully',
            data: {
                addresses: user.addresses
            }
        });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating address',
            error: error.message
        });
    }
};

const getAddresses = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            addresses: user.addresses || []
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching addresses',
            error: error.message
        });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { id, addressId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }

        const user = await User.findByIdAndUpdate(
            id,
            {
                $pull: { addresses: { _id: addressId } }
            },
            {
                new: true
            }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User or address not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Address deleted successfully',
            data: {
                addresses: user.addresses
            }
        });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting address',
            error: error.message
        });
    }
};

module.exports = {
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress
};