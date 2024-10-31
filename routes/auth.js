const express = require('express');
const { google } = require('googleapis');
const User = require('../models/User');
const { generateAuthUrl, refreshAccessTokenIfNeeded } = require('../services/googleService');

const router = express.Router();
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

// Route for home
router.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// Route to initiate Google OAuth flow
router.get('/auth', (req, res) => {
    const authUrl = generateAuthUrl(oauth2Client);
    res.redirect(authUrl);
});

// Route to handle Google OAuth callback
router.get('/auth/oauth2callback', async (req, res) => {
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
router.get('/profile', async (req, res) => {
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
router.get('/logout', (req, res) => {
req.session.destroy(err => {
    if (err) {
    return res.status(500).send('Failed to log out');
    }
    res.redirect('/');
});
});

// Route to redirect to user's Google Drive
router.get('/drive', async (req, res) => {
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

module.exports = router;
