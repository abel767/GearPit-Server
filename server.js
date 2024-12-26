require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

// Models
const User = require('./models/User/userModel');

// Routes
const userRoutes = require('./routes/user/userRoutes');
const adminRoutes = require('./routes/admin/adminRoutes');
const authRoute = require('./routes/auth/authRoute');

const app = express();

// CORS Options
const corsOptions = {
    origin: process.env.CORS,
    methods: ['GET', 'POST','PUT','PATCH'],
    credentials: true,
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(cookieParser());

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Safer to set to false
}));

app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(
    new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      scope:["profile","email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(profile)
        let user = await User.findOne({ googleId: profile.id });
        
        if (!user) {
          user = new User({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            userName: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            isGoogleUser: true,
            profileImage: profile.photos && profile.photos.length > 0 
             ? profile.photos[0].value 
             : 'default_profile_image_url'
           
          });
          
          await user.save();
        }
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    })
  );

passport.serializeUser((user, done) => done(null, user.id)); // Serialize only the user ID
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log(`MongoDB connected to ${mongoose.connection.name}`);
    })
    .catch((error) => {
        console.error('MongoDB connection error', error);
    });

// Routes
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoute);

// Server Setup
app.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
