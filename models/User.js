const mongoose = require('mongoose');

// Define User Schema
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
});

module.exports = mongoose.model('User', userSchema);
