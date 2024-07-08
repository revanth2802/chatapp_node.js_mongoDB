const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    text: String, // Adjusted to allow text to be optional for file messages
    createdAt: {
        type: Date,
        default: Date.now,
    },
    file: {
        filename: String, // Store filename for file messages
        path: String, // Store file path for file messages
        mimetype: String, // Store MIME type for file messages
    },
    deleted: {
        type: Boolean,
        default: false,
    }
});

module.exports = mongoose.model('Message', messageSchema);
