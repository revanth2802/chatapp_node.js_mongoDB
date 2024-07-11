const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const Message = require('./models/message');
const UploadedFile = require('./models/uploadedFile');

require('dotenv').config(); // Load environment variables from .env file if present

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI; // Ensure this variable is set in your environment or .env file

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB:', err);
});


// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

app.use(express.static('public'));


// Route to delete all messages
app.delete('/messages', async (req, res) => {
    try {
        await Message.deleteMany({}); // Delete all messages
        io.emit('allMessagesDeleted'); // Notify all clients that all messages have been deleted
        res.status(200).send('All messages deleted');
    } catch (err) {
        console.error('Error deleting messages:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { username, message } = req.body;
        const newMessage = new Message({
            username,
            text: message,
            file: {
                filename: req.file.filename,
                path: '/uploads/' + req.file.filename,
                mimetype: req.file.mimetype
            }
        });

        // Save the message first
        await newMessage.save();

        // Then save the file details to MongoDB using UploadedFile model
        const uploadedFile = new UploadedFile({
            filename: req.file.filename,
            path: '/uploads/' + req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        await uploadedFile.save();

        // Emit message event to all clients
        io.emit('message', { _id: newMessage._id, username, file: newMessage.file });

        res.status(200).send('File uploaded successfully');
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('Error uploading file');
    }
});


io.on('connection', (socket) => {
    console.log('New client connected');

    // Send all non-deleted messages to the client when they connect
    Message.find({ deleted: false }).then(messages => {
        socket.emit('init', messages);
    }).catch(err => {
        console.error('Error fetching messages:', err);
    });

    socket.on('message', async function(msg) {
        try {
            const { username, message } = msg;
            const newMessage = new Message({
                username,
                text: message
            });

            // Save the message to MongoDB
            await newMessage.save();

            // Emit message event to all clients
            io.emit('message', { _id: newMessage._id, username, text: newMessage.text });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on('deleteMessage', async (messageId) => {
        if (mongoose.isValidObjectId(messageId)) {
            try {
                await Message.findByIdAndDelete(messageId);
                io.emit('messageDeleted', messageId);
            } catch (err) {
                console.error('Error deleting message:', err);
            }
        } else {
            console.error('Invalid messageId:', messageId);
        }
    });

    // Event listener for clearing all messages
    socket.on('clearAllMessages', async () => {
        try {
            await Message.deleteMany({});
            io.emit('allMessagesDeleted'); // Notify all clients that all messages have been deleted
        } catch (err) {
            console.error('Error deleting all messages:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
