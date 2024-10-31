require('dotenv').config(); // Load environment variables from .env file

const config = {
    PORT: process.env.PORT || 3000, // Default port
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase', // MongoDB connection string
    GOOGLE_CLIENT_ID: process.env.CLIENT_ID, // Google Client ID from .env
    GOOGLE_CLIENT_SECRET: process.env.CLIENT_SECRET, // Google Client Secret from .env
    REDIRECT_URI: process.env.REDIRECT_URI || 'http://localhost:3000/auth/google/callback', // Redirect URI
    SESSION_SECRET: process.env.SESSION_SECRET || 'mysecret', // Secret for session management
};

module.exports = config;
