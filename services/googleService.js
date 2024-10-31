const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
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

module.exports = {
    generateAuthUrl,
    refreshAccessTokenIfNeeded,
    oauth2Client // Optional: export oauth2Client if needed elsewhere
};
