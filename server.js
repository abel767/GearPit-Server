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
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));


// Middleware
app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.options('*', cors(corsOptions));  // Move this before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // true in production
    httpOnly: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
  

app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true
      },
      async (request, accessToken, refreshToken, profile, done) => {
        try {
          
          console.log('Google authentication started for:', profile.emails[0].value);
          let user = await User.findOne({ email: profile.emails[0].value });
          
          const profileImage = profile.photos?.[0]?.value.replace('=s96-c', '=s400-c') || null;
  
          if (!user) {
            // Create new user if doesn't exist
            user = new User({
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              userName: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
              isGoogleUser: true,
              verified: true,
              profileImage: profileImage,
              isBlocked: false
            });
            
            await user.save();
            console.log('New Google user created:', user._id);
          } else if (!user.googleId) {
            // If user exists but doesn't have googleId (registered through email)
            user.googleId = profile.id;
            user.isGoogleUser = true;
            if (profileImage) user.profileImage = profileImage;
            await user.save();
            console.log('Existing user linked with Google:', user._id);
          }
  
          if (user.isBlocked) {
            console.log('Blocked user attempted login:', user._id);
            return done(null, false, { message: 'Your account is blocked. Contact support.' });
          }
  
          // Generate tokens
          const accessToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
          );
  
          const refreshToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
          );
  
          // Store refresh token in user document
          user.refreshToken = refreshToken;
          await user.save();
  
          // Attach tokens to user object
          user.accessToken = accessToken;
          user.refreshToken = refreshToken;
  
          return done(null, user);
        } catch (error) {
          console.error('Google Strategy Error:', error);
          return done(error, null);
        }
      }
    )
  );
  
  // Serialize user for the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from the session
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

app.get('/', (req, res) => {
  res.json({ message: "GearPit Backend API is running!" });
});

// Server Setup
app.listen(process.env.PORT,'0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${process.env.PORT}`);
});
