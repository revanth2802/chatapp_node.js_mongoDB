// ./models/uploadedFile.js

const mongoose = require('mongoose');

const uploadedFileSchema = new mongoose.Schema({
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('UploadedFile', uploadedFileSchema);
