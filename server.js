require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const jwt = require('jsonwebtoken')
// Models
const User = require('./models/User/userModel');

// Routes
const userRoutes = require('./routes/user/userRoutes');
const adminRoutes = require('./routes/admin/adminRoutes');
const authRoute = require('./routes/auth/authRoute');


const app = express();

// CORS Options
const corsOptions = {
  origin: process.env.CORS || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
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
  saveUninitialized: false,
  cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(
  new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      passReqToCallback: true,
      scope: ["profile", "email"]
  },
  async (request, accessToken, refreshToken, profile, done) => {
      try {
          let user = await User.findOne({ googleId: profile.id });
          
          const profileImage = profile.photos?.[0]?.value.replace('=s96-c', '=s400-c') || null;

          if (!user) {
              user = new User({
                  firstName: profile.name.givenName,
                  lastName: profile.name.familyName,
                  userName: profile.displayName,
                  email: profile.emails[0].value,
                  googleId: profile.id,
                  isGoogleUser: true,
                  verified: true,
                  profileImage: profileImage,
              });
              
              await user.save();
          } else if (profileImage && user.profileImage !== profileImage) {
              user.profileImage = profileImage;
              await user.save();
          }

          // Generate JWT token
          const jwtAccessToken = jwt.sign(
              { 
                  userId: user._id, 
                  email: user.email,
                  isGoogleUser: true
              },
              process.env.ACCESS_TOKEN_SECRET,
              { expiresIn: '15m' }
          );

          // Attach token to user object
          user.accessToken = jwtAccessToken;
          
          return done(null, user);
      } catch (error) {
          console.error('Google Strategy Error:', error);
          return done(error, null);
      }
  })
);



passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
      const user = await User.findById(id).select('-password -salt');
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
