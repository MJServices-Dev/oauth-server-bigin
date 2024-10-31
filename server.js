const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
});

const User = mongoose.model('User', userSchema);

// Initialize session middleware
app.use(session({
  secret: 'mysecret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // Session expires after 1 hour
}));

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Initialize OAuth2 Client with Google credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI // This should match the redirect URI set in Google Developer Console
);

// Set the scopes you need for the app
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets'
];

// Helper to generate the OAuth2 URL for user consent
function generateAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Use 'offline' to get a refresh token
    scope: SCOPES,
    prompt: 'select_account' // Prompt the user to select an account
  });
}

// Function to refresh the access token if needed
async function refreshAccessTokenIfNeeded(req) {
  const { tokens } = req.session;

  if (tokens && tokens.refresh_token) {
    oauth2Client.setCredentials(tokens);

    // Check if the access token is expiring soon
    if (oauth2Client.isTokenExpiring()) {
      try {
        const newTokens = await oauth2Client.refreshAccessToken();
        req.session.tokens = newTokens.credentials; // Update the session with new tokens
      } catch (error) {
        console.error('Error refreshing access token:', error);
        throw new Error('Could not refresh access token');
      }
    }
  }
}

// Route for home
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

// Route to initiate Google OAuth flow
app.get('/auth', (req, res) => {
  const authUrl = generateAuthUrl();
  res.redirect(authUrl);
});

// Route to handle Google OAuth callback
app.get('/auth/oauth2callback', async (req, res) => {
  const { code } = req.query;

  if (code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      const { id, email, name } = userInfo.data;

      let user = await User.findOne({ googleId: id });

      if (user) {
        user.accessToken = tokens.access_token;
        user.refreshToken = tokens.refresh_token;
        await user.save();
      } else {
        user = new User({
          googleId: id,
          email,
          name,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
        await user.save();
      }

      req.session.tokens = tokens; // Store tokens in session for future requests
      req.session.user = { id, email, name }; // Store user info in session
      res.redirect('/profile');
    } catch (err) {
      console.error('Error retrieving tokens:', err);
      res.status(500).send('Authentication failed');
    }
  } else {
    res.status(400).send('No authorization code provided');
  }
});

// Route to display user's profile information
app.get('/profile', async (req, res) => {
  if (!req.session.tokens) {
    return res.redirect('/');
  }

  try {
    await refreshAccessTokenIfNeeded(req); // Check and refresh token if needed

    oauth2Client.setCredentials(req.session.tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

    const userInfo = await oauth2.userinfo.get();
    res.render('profile', { user: userInfo.data });
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).send('Failed to fetch user info');
  }
});

// Route to log out the user
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Failed to log out');
    }
    res.redirect('/');
  });
});

// Route to redirect to user's Google Drive
app.get('/drive', async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).send('User not authenticated');
  }

  // Use the access token from the session to redirect the user
  const { access_token } = req.session.tokens;

  // Construct the Google Drive URL with the user's access token
  const redirectUrl = `https://drive.google.com/?authuser=${req.session.user.email}&access_token=${access_token}`;

  // Redirect the user to their Google Drive
  res.redirect(redirectUrl);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
