const socket = io();

const form = document.getElementById('form');
const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('input');
const fileInput = document.getElementById('fileInput'); // File input field
const messages = document.getElementById('messages');
const clearMessagesBtn = document.getElementById('clearMessagesBtn'); // Reference to clear button

// Function to change username
function changeUsername() {
    const newUsername = prompt('Enter new username:');
    if (newUsername) {
        usernameInput.value = newUsername;
        usernameInput.disabled = false; // Enable the input after changing
    }
}

form.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const message = messageInput.value.trim();
    const file = fileInput.files[0]; // Get the selected file

    if (username && (message || file)) {
        if (file) {
            uploadFile(username, message, file);
        } else {
            sendMessage(username, message);
        }
        messageInput.value = '';
        fileInput.value = ''; // Clear the file input
    }
});

// Function to upload file and send message
function uploadFile(username, message, file) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('message', message);
    formData.append('file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            return response.text();
        }
        throw new Error('Upload failed');
    }).then(data => {
        console.log('File uploaded successfully');
    }).catch(error => {
        console.error('Error uploading file:', error);
    });
}

// Function to send message without file
function sendMessage(username, message) {
    socket.emit('message', { username, message });
}

// Event listener for clearing all messages
clearMessagesBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to delete all messages?')) {
        socket.emit('clearAllMessages'); // Emit event to server to clear all messages
    }
});

// Socket event handlers
socket.on('init', function(msgs) {
    msgs.forEach(msg => {
        if (msg.file) {
            displayFileMessage(msg._id, msg.username, msg.file);
        } else {
            displayMessage(msg._id, msg.username, msg.text); // Corrected to display 'text' instead of 'message'
        }
    });
    scrollToBottom();
});

socket.on('message', function(msg) {
    if (msg.file) {
        displayFileMessage(msg._id, msg.username, msg.file);
    } else {
        displayMessage(msg._id, msg.username, msg.text); // Corrected to display 'text' instead of 'message'
    }
    scrollToBottom();
});

socket.on('messageDeleted', function(messageId) {
    const messageItem = document.getElementById(messageId);
    if (messageItem) {
        messageItem.parentNode.removeChild(messageItem);
    }
});

socket.on('allMessagesDeleted', function() {
    messages.innerHTML = ''; // Clear all messages from the UI
});

// Function to display text messages
function displayMessage(messageId, username, message) {
    const item = document.createElement('li');
    item.id = messageId;
    item.innerHTML = `<strong>${username}:</strong> ${message} <button onclick="deleteMessage('${messageId}')">Delete</button>`;
    messages.appendChild(item);
}

// Function to display file messages (links to uploaded files)
function displayFileMessage(messageId, username, file) {
    const item = document.createElement('li');
    item.id = messageId;
    item.innerHTML = `<strong>${username}:</strong> File: ${file.filename} (${file.mimetype}) <a href="${file.path}" target="_blank">Download</a> <button onclick="deleteMessage('${messageId}')">Delete</button>`;
    messages.appendChild(item);
}

// Function to delete a message
function deleteMessage(messageId) {
    socket.emit('deleteMessage', messageId); // Emit event to server to delete the message
}

// Function to scroll to the bottom of the messages
function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
}
