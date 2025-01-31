const bcrypt = require('bcrypt');
const User = require("../../models/User/userModel");
const crypto = require('crypto')

const getProfileData = async(req,res)=>{
    try{
        const userId = req.params.id
        console.log(userId)
        console.log('full req.params', req.params)

        if(!userId){
            return res.status(400).json({message: 'User ID is required'})
        }

        const user = await User.findById(userId)
        .select('-password')
        .lean()

        if(!user){
            return res.status(404).json({message: 'User not found'})
        }

        res.status(200).json({userData: user})
    }catch(error){
        console.error('Error occured', error)
        res.status(500).json({
            message: "error fetching profile data",
            error: error.message,
            stack: error.stack
        })
    }
}

const updateUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        // Destructure directly from req.body since formData is no longer nested
        const { firstName, lastName, userName, email, phone } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                firstName,
                lastName,
                userName,
                email,
                phone
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.log('profile update error', error);
        res.status(500).json({
            message: 'Error updating profile',
            error: error.message
        });
    }
};


const changePassword = async(req,res)=>{
    try{
        const {currentPassword, newPassword} = req.body
        const userId = req.params.id

        if(!currentPassword || !newPassword){
            return res.status(400).json({
                message: 'Current and new password are required'
            })
        }
        const user = await User.findById(userId)

        if(!user){
            return res.status(404).json({
                message: 'User not found',
            })
        }

        // verifying current password 
        if(user.password){
            const isCurrentPasswordCorrect = await bcrypt.compare(
                currentPassword + user.salt,
                user.password
            )

            if(!isCurrentPasswordCorrect){
                return res.status(401).json({
                    message: 'Current password is incorrect',
                })
            }
        }

        // validating new password length
        if(newPassword.length < 6){
            return res.status(400).json({
                message: 'Password must be at least 6 characters long'
            })
        }

        // generate a new salt and hash the new password 
        const salt = crypto.randomBytes(16).toString('hex')
        const hashedNewPassword = await bcrypt.hash(newPassword + salt, 10)

        // updating user password and salt 
        user.password = hashedNewPassword
        user.salt = salt
        await user.save()

        res.status(200).json({
            message: 'Password changed successfully'
        })


     }catch(error){
          console.error('Password change error', error)
          res.status(500).json({
            message: 'An error occured while changing the password',
            error: error.message
          })
    }
}

  
const profileImageUpdate = async(req,res)=>{
    try{
        const {id} = req.params
        const {profileImage} = req.body

        console.log(profileImage)

        if(!id || !profileImage){
            return res.status(400).json({
                message: 'Please provide both id and profile image',
            })
        }

        const updatedUser = await User.findByIdAndUpdate(id,
            {profileImage},
            {new: true, runValidators: true}
        )

        if(!updatedUser){
            return res.status(404).json({
                message: 'User not found'
            })
        }

        res.status(200).json({
            message: 'Profile Image Updated Successfully',
            user: {
                id: updatedUser._id,
                profileImage: updatedUser.profileImage
            }
        })
        
    }catch(error){
        console.error('Error updating profile image', error)

        if(error.name === 'validationError'){
            return res.status(400).json({
                message: 'Invalid data provided',
                errors: Object.values(error.errors).map(err=> err.message)
            })
        }

        res.status(500).json({
            message: 'An error occured while updating the profile image',
            error: error.message
        })
    }
}

module.exports = {
    getProfileData,
    updateUserProfile,
    changePassword,
    profileImageUpdate
}


