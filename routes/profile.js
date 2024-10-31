const express = require('express');
const { refreshAccessTokenIfNeeded, getUserInfo } = require('../services/googleService');

const router = express.Router();

// Route to display user's profile information
router.get('/profile', async (req, res) => {
    if (!req.session.tokens) {
    return res.redirect('/');
    }

    try {
    await refreshAccessTokenIfNeeded(req); // Check and refresh token if needed

    const userInfo = await getUserInfo(req.session.tokens.access_token);
    res.render('profile', { user: userInfo.data });
} catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).send('Failed to fetch user info');
}
});

// Route to redirect to user's Google Drive
router.get('/drive', async (req, res) => {
    if (!req.session.tokens) {
    return res.status(401).send('User not authenticated');
}

    const { access_token } = req.session.tokens;
    const redirectUrl = `https://drive.google.com/?authuser=${req.session.user.email}&access_token=${access_token}`;

    res.redirect(redirectUrl);
});

module.exports = router;
