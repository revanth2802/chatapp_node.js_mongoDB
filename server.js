const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Message = require('./models/message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI; // Replace with your MongoDB connection string

mongoose.connect(MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected');

    // Send all messages to the client when they connect
    Message.find().then(messages => {
        socket.emit('init', messages);
    }).catch(err => {
        console.error('Error fetching messages:', err);
    });

    socket.on('message', (data) => {
        const { username, message } = data;
        const newMessage = new Message({ username, text: message });
        newMessage.save().then(() => {
            io.emit('message', { username, text: message });
        }).catch(err => {
            console.error('Error saving message:', err);
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
