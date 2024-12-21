const User = require('../../models/User/userModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const otpVerification = require('../../models/OTP/otpverificationModel')
// hashing the password with salt for more secure
const securePassword = async (password)=>{
    try{
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds)
        const hashedPassword = await bcrypt.hash(password + salt, saltRounds)

         return(hashedPassword, salt)
    }catch(error){
        console.log(error)
        throw new Error('Error while securing the password')
    }
}

// otp transport email and password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD
    }
})


const generateAccessToken = (user)=>{
  return jwt.sign({
    userId: user._id,
    email:user.email
  },
PerformanceObserverEntryList.env.RFRESH_TOKEN_SECRECT,
{
    expiresIn: '7d'
})
}

const refreshTokenController = async(req,res)=>{
    try{
        const refreshToken = req.body.refreshToken

        if(!refreshToken){
            return res.status(401).json({message: 'No refresh token'})
        }
          // verifying the refresh token (decoding it )
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decoded.userId)

        if(!user){
            return res.status(401).json({message: 'Invalid token'})
        }
        const newAccessToken = generateAccessToken(user)

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        })

        res.json({message: 'Token Refreshed'})
    }catch(error){
        res.status(401).json({message: 'Invalid refresh Token'})
    }
}

const signUp = async(req,res)=>{
    try{
        const {firstName, lastName, userName, password, email,phone} = req.body
        console.log(req.body)
        const isEmailExists = await User.findOne({email})
        if(!isEmailExists){
            res.status(409).json({message: 'User already exists'})
        }else{
            const {hashedPassword, salt} = await securePassword(password)

            const user = await User.create({
                firstName,
                lastName,
                userName,
                email,
                password: hashedPassword,
                salt,
                phone,
            })

            await user.save()
            console.log("user created successfully")
            await sendOTPVerificationEmail({id: user.id, email: user.email})

            res.status(201).json({
                message: 'your account registered successfully, OTP sent to email',
                userId: user._id,
                email: email
            })
        }
    }catch(error){
       console.error('Singup error', error.message)
       res.status(500).json({message: error.message || 'Something went wrong'})
    }
}


const sendOTPVerificationEmail = async({id, email})=>{
    try{
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`
        
        const salt = crypto.randomBytes(16).toString('hex')
        const saltedOTP = otp + salt
        const hashedOTP = await bcrypt.hash(saltedOTP, 10)

        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: 'Verify your Email',
            text: `Your OTP is ${otp}`
        }

        const newOTPVerification = new otpVerification({
            userId: id,
            otp: hashedOTP,
            salt: salt,
            createdAt: Date.now(),
            expiresAt: Date.now() + 30000
        })

        await newOTPVerification.save()

        try{
           await transporter.sendMail(mailOptions)
        }catch(emailError){
            console.error('Email Sending error', emailError.message)
            throw new Error(`Failed to send OTP. Reason: ${emailError. message}`)
        }

        console.log('OTP Verification email sent SuccessFully')

    }catch(error){
     console.error("Error sending otp", error.message)
     throw new Error('Error sending OTP verification email')
    }
}

const verifyOTP = async(req,res)=>{
    try{
        const {userId, otp} = req.body

        if(!userId || !otp){
            throw new Error(`Empty OTP details are not allowed`)
        }
        const otpVerificationRecords = await otpVerificatoin.find({userId})
        if(otpVerificationRecords.length<=0){
            throw new Error(`Account Record doesn't exist or has already been verified.`)
        }

        const {expiresAt, otp: hashedOTP, salt} = otpVerificationRecords[0]

        if(expiresAt < Date.now()){
            await otpVerification.deleteMany({userId})
            throw new Error('Code has expired. please try again')
        }

        const saltedOTP = otp + salt 
        const validOTP = await bcrypt.compare(saltedOTP, hashedOTP)

        if(!validOTP){
            throw new Error('Invalid OTP')
        }

        const user = await User.findById(userId)

        const accessToken = generateAccessToken(user)
        const refreshToken = generateRefreshToken(user)

        await User.findOne({_id: userID}, {
            verified: true,
            refreshToken: refreshToken,
        })

        await otpVerification.deleteMany({userId})

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        })

        res.json('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        })

        res.json({
            status: 'VERIFIED',
            message: 'User email verified successfully',
            userId: user._id,
            email: user.email,
        })
    }catch(error){
        res.status(400).json({
            status: 'FAILED',
            message: error.message
        })
    }
}

const resendOTP = async(req,res)=>{
    try{
        const{userId, email} = req.body
        console.log(req.body)
        if(!userId || !email ){
            throw Error('Empty otp details are not allowed')
        }else{
            await otpVerification.deleteMany({userId})
            await sendOTPVerificationEmail({id: userId, email:email})

            res.status(200).json({
                status: 'Success',
                message: 'New OTP sent successfully'

            }
            )
        }
    }catch(error){
        res.json({status: 'Failed', message: error.message})
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: "Your account is blocked. Contact support." });
        }

        if (user.verified || user.isGoogleUser) {
            const isPasswordValid = await bcrypt.compare(password + user.salt, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            // Generate tokens
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            await User.updateOne({ _id: user._id }, {
                refreshToken: refreshToken,
            });

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000, // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.json({
                status: "VERIFIED",
                message: "User login success",
                user: {
                    id: user._id,
                    name: user.username,
                    email: user.email,
                    image: user.profileImage,
                    phone: user.phone,
                },
                role: "user",
            });
        } else {
            return res.status(500).json({ message: "User not verified or invalid Google user" });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong during login" });
    }
};


const getUserData = async(req,res)=>{
    try{
        const id = req.params.id
        console.log(id)
        const user = await User.findById(id)

        if(!user){
            return res.status(404).json({message: 'User not found'})
        }
        res.json(user)
    }catch(error){
        console.error('Error fetching user in home', error)
    }
}


const logout = async(req,res)=>{
    try{
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: false,
            sameSite: 'strict'
        })

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: false,
            sameSite: 'strict'
        })

        res.json({message: 'logged out successfully'})
    }catch(error){
        res.status(500).sjon({message: 'Logout failed'})
    }
}


module.exports = {
    signUp,
    verifyOTP,
    resendOTP,
    refreshTokenController,
    login,
    logout,
    getUserData
}