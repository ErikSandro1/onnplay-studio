const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for dev, restrict in production
    methods: ["GET", "POST"]
  }
});

// Store active rooms and participants
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join Room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Chat Message
  socket.on('send_message', (data) => {
    // data: { roomId, user, message, timestamp }
    io.to(data.roomId).emit('receive_message', data);
  });

  // Sync State (Mixer, T-Bar, etc.)
  socket.on('sync_state', (data) => {
    // Broadcast state changes to other clients in the room (excluding sender)
    socket.to(data.roomId).emit('update_state', data);
  });

  // Reactions
  socket.on('send_reaction', (data) => {
    io.to(data.roomId).emit('receive_reaction', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
