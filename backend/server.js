// Load environment variables first
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const roomManager = require('./services/roomManager');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Get configuration from environment variables
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Apply security middleware
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle joining a room
  socket.on('join-room', (data) => {
    const { roomId, nickname } = data;

    // Basic validation
    if (!roomId || !nickname) {
      socket.emit('error', { message: 'Room ID and nickname are required' });
      return;
    }

    // Validate nickname (1-30 alphanumeric characters, spaces, underscores)
    if (nickname.length < 1 || nickname.length > 30) {
      socket.emit('error', { message: 'Nickname must be 1-30 characters' });
      return;
    }

    // Join the Socket.IO room
    socket.join(roomId);

    // Add user to room manager
    roomManager.addUser(roomId, socket.id, nickname);

    // Store room info on socket for easy access
    socket.roomId = roomId;
    socket.nickname = nickname;

    // Get current room state
    const room = roomManager.getRoom(roomId);
    const users = roomManager.getRoomUsers(roomId);

    // Send confirmation to the joining user
    socket.emit('joined-room', {
      roomId,
      nickname,
      users,
      messages: room.messages // Send recent message history
    });

    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      id: socket.id,
      nickname
    });

    console.log(`${nickname} joined room: ${roomId}`);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const { content } = data;
    const roomId = socket.roomId;
    const nickname = socket.nickname;

    // Validate message
    if (!roomId || !nickname) {
      socket.emit('error', { message: 'You must join a room first' });
      return;
    }

    if (!content || content.length === 0 || content.length > 500) {
      socket.emit('error', { message: 'Message must be 1-500 characters' });
      return;
    }

    // Create message object
    const message = {
      id: `${Date.now()}-${socket.id}`,
      senderId: socket.id,
      nickname,
      content,
      timestamp: Date.now()
    };

    // Store message in room buffer
    roomManager.addMessage(roomId, message);

    // For Phase 1, broadcast immediately to everyone in the room
    // (Phase 3 will add delay logic)
    io.to(roomId).emit('new-message', message);

    console.log(`Message in ${roomId} from ${nickname}: ${content.substring(0, 50)}...`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    const nickname = socket.nickname;

    if (roomId) {
      // Remove user from room manager
      roomManager.removeUser(roomId, socket.id);

      // Notify others in the room
      socket.to(roomId).emit('user-left', {
        id: socket.id,
        nickname
      });

      console.log(`${nickname || socket.id} left room: ${roomId}`);
    }

    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for: ${CORS_ORIGIN}`);
});
