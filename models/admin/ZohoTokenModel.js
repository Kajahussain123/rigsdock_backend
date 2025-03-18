const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
},{timestamps: true});

const Token = mongoose.model('ZohoToken', tokenSchema);

module.exports = Token;