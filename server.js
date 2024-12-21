require('dotenv').config();
const express = require('express')
const session = require('express-session')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
// const User = require('./models/User/userModel')
const userRoutes = require('./routes/user/userRoutes')
const adminRoutes = require('./routes/admin/adminRoutes')
const authRoute = require('./routes/auth/authRoute')
//User model
const User = require('./models/User/userModel')
// passport and google auth requries
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth2')

// dotenv config


console.log('AUTH_EMAIL:', process.env.AUTH_EMAIL); // Log to check if the email is being loaded correctly
console.log('AUTH_PASSWORD:', process.env.AUTH_PASSWORD);


const app = express()

const corsOptions = {
    origin: process.env.CORS,
    credentials: true
}

// middlewares
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors(corsOptions))

// session 
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}))

app.use(passport.initialize())
app.use(passport.session())

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.CALLBACKURL,
        scope:['profile', 'email']

    },
   async (accessToken, refreshToken, profile, done)=>{

   try{
    console.log(profile)
    let user = await User.findOne({googleId: profile.id})
    if(!user){
        user = new User({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            userName: profile.displayName,
            email: profile.email[0].value,
            googleId: profile.id,
            isGoogleUser: true,
            profileImage: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : 'default_profile_image_url'
        })
        await user.save()
    }
    return done(null, user)
   }catch(error){
      return done(error, null)
   }
})
)

passport.serializeUser((user, done)=> done(null,user))
passport.deserializeUser((user, done)=> done(null,user))


// connecting to mongoDB

mongoose.connect(process.env.MONGO_URL)
.then(()=>{
    console.log(`MongoDB connected to ${mongoose.connection.name}`)
})
.catch(error=>{
    console.error('MongoDB connection error', error)
})


// routes
app.use('/user', userRoutes)
app.use('/admin', adminRoutes)
app.use('/auth',authRoute)

app.listen(process.env.PORT, ()=>{
    console.log(`server is running on http://localhost:${process.env.PORT}`)
})