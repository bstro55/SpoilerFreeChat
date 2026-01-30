// Load environment variables first
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const roomManager = require('./services/roomManager');
const messageQueue = require('./services/messageQueue');
const rateLimiter = require('./services/rateLimiter');
const validation = require('./services/validation');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Trust proxy (required for Koyeb/Vercel to get real client IP)
// This enables express-rate-limit to see the actual IP from X-Forwarded-For
app.set('trust proxy', 1);

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

// Connection rate limiting per IP
// Limits new Socket.IO connections to prevent connection spam/DoS
// Only applies to handshake requests (new connections), not ongoing polls
const connectionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minute window
  limit: 10,                  // 10 new connections per window per IP
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,       // Disable X-RateLimit-* headers
  // Skip if this is an existing connection polling (has session ID)
  skip: (req) => req.query.sid !== undefined,
  message: { message: 'Too many connections from this IP, please try again later' }
});

// Apply rate limiter to Socket.IO's underlying HTTP engine
io.engine.use(connectionLimiter);

// Initialize the message queue service with Socket.IO
messageQueue.initialize(io);

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

    // Validate and sanitize room ID
    const roomValidation = validation.validateRoomId(roomId);
    if (!roomValidation.valid) {
      socket.emit('error', { message: roomValidation.error });
      return;
    }

    // Validate and sanitize nickname
    const nicknameValidation = validation.validateNickname(nickname);
    if (!nicknameValidation.valid) {
      socket.emit('error', { message: nicknameValidation.error });
      return;
    }

    const sanitizedRoomId = roomValidation.sanitized;
    const sanitizedNickname = nicknameValidation.sanitized;

    // Join the Socket.IO room
    socket.join(sanitizedRoomId);

    // Add user to room manager
    roomManager.addUser(sanitizedRoomId, socket.id, sanitizedNickname);

    // Store room info on socket for easy access
    socket.roomId = sanitizedRoomId;
    socket.nickname = sanitizedNickname;

    // Get current room state
    const room = roomManager.getRoom(sanitizedRoomId);
    const users = roomManager.getRoomUsers(sanitizedRoomId);

    // Send confirmation to the joining user
    socket.emit('joined-room', {
      roomId: sanitizedRoomId,
      nickname: sanitizedNickname,
      users,
      messages: room.messages // Send recent message history
    });

    // Notify others in the room (include sync status)
    socket.to(sanitizedRoomId).emit('user-joined', {
      id: socket.id,
      nickname: sanitizedNickname,
      isSynced: false,
      offset: 0,
      offsetFormatted: 'Not synced'
    });

    console.log(`${sanitizedNickname} joined room: ${sanitizedRoomId}`);
  });

  // Handle game time synchronization
  socket.on('sync-game-time', (data) => {
    const { quarter, minutes, seconds } = data;
    const roomId = socket.roomId;
    const nickname = socket.nickname;

    // Validate user is in a room
    if (!roomId || !nickname) {
      socket.emit('error', { message: 'You must join a room first' });
      return;
    }

    // Update user's game time and calculate offset
    const result = roomManager.updateUserGameTime(
      roomId,
      socket.id,
      quarter,
      minutes,
      seconds
    );

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Send confirmation to the user with their offset
    socket.emit('sync-confirmed', {
      quarter,
      minutes,
      seconds,
      offset: result.offset,
      offsetFormatted: result.offsetFormatted,
      isBaseline: result.isBaseline
    });

    // Notify others that this user has synced (update their user list)
    socket.to(roomId).emit('user-synced', {
      id: socket.id,
      nickname,
      isSynced: true,
      offset: result.offset,
      offsetFormatted: result.offsetFormatted
    });

    // If other users' offsets changed (due to baseline shift), notify them
    if (result.updatedUsers && result.updatedUsers.size > 0) {
      for (const [userId, updateData] of result.updatedUsers) {
        // Don't re-notify the user who just synced (they already got sync-confirmed)
        if (userId !== socket.id) {
          // Send offset-updated to that specific user
          io.to(userId).emit('offset-updated', {
            offset: updateData.offset,
            offsetFormatted: updateData.offsetFormatted,
            isBaseline: updateData.offset === 0
          });

          // Also update everyone's view of that user
          const user = roomManager.getUser(roomId, userId);
          if (user) {
            io.to(roomId).emit('user-synced', {
              id: userId,
              nickname: user.nickname,
              isSynced: true,
              offset: updateData.offset,
              offsetFormatted: updateData.offsetFormatted
            });
          }
        }
      }
    }

    console.log(`${nickname} synced in ${roomId}: Q${quarter} ${minutes}:${seconds.toString().padStart(2, '0')} - ${result.offsetFormatted}`);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const { content } = data;
    const roomId = socket.roomId;
    const nickname = socket.nickname;

    // Validate user is in a room
    if (!roomId || !nickname) {
      socket.emit('error', { message: 'You must join a room first' });
      return;
    }

    // Validate and sanitize message content
    const messageValidation = validation.validateMessage(content);
    if (!messageValidation.valid) {
      socket.emit('error', { message: messageValidation.error });
      return;
    }

    // Check rate limit (10 messages per minute)
    const rateCheck = rateLimiter.checkRateLimit(socket.id);
    if (!rateCheck.allowed) {
      socket.emit('error', {
        message: `Slow down! You can send again in ${rateCheck.retryAfter} seconds`
      });
      return;
    }

    // Create message object with server receive timestamp
    const now = Date.now();
    const sanitizedContent = messageValidation.sanitized;
    const message = {
      id: `${now}-${socket.id}`,
      senderId: socket.id,
      nickname,
      content: sanitizedContent,
      timestamp: now
    };

    // Store message in room buffer (for users who join/refresh later)
    roomManager.addMessage(roomId, message);

    // Get all users in the room
    const room = roomManager.getRoom(roomId);
    const users = room.users;

    // Deliver message to each user based on their offset
    for (const [recipientSocketId, recipientUser] of users) {
      const offset = recipientUser.offset;

      // Sender always sees their own message immediately
      if (recipientSocketId === socket.id) {
        messageQueue.deliverImmediately(recipientSocketId, message);
        continue;
      }

      // Users who haven't synced get messages immediately
      // (we don't know their offset, so we can't delay)
      if (!roomManager.hasUserSynced(roomId, recipientSocketId)) {
        messageQueue.deliverImmediately(recipientSocketId, message);
        continue;
      }

      // offset = 0 means user is "live" - deliver immediately
      if (offset === 0) {
        messageQueue.deliverImmediately(recipientSocketId, message);
        continue;
      }

      // Queue the message for delayed delivery
      const deliverAt = now + offset;
      messageQueue.queueMessage(recipientSocketId, message, deliverAt);
    }

    console.log(`Message in ${roomId} from ${nickname}: ${sanitizedContent.substring(0, 50)}...`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    const nickname = socket.nickname;

    // Clear any queued messages for this user (they won't receive them)
    const clearedCount = messageQueue.clearUserQueue(socket.id);
    if (clearedCount > 0) {
      console.log(`[MessageQueue] Cleared ${clearedCount} queued messages for ${nickname || socket.id}`);
    }

    // Clear rate limiter data for this user
    rateLimiter.clearUser(socket.id);

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

// Session expiration - disconnect users after 4 hours
// This prevents stale connections from consuming server resources
const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

// Check for expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const stats = roomManager.getStats();

  for (const roomInfo of stats.rooms) {
    const users = roomManager.getRoomUsers(roomInfo.id);

    for (const user of users) {
      if (now - user.joinedAt > SESSION_MAX_AGE_MS) {
        const socket = io.sockets.sockets.get(user.id);
        if (socket) {
          console.log(`[Session] Expiring session for ${user.nickname} in room ${roomInfo.id}`);
          socket.emit('session-expired', {
            message: 'Your session has expired after 4 hours. Please rejoin the room.'
          });
          socket.disconnect(true);
        }
      }
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for: ${CORS_ORIGIN}`);
});
