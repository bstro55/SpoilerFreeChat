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
const sessionManager = require('./services/sessionManager');
const authService = require('./services/authService');
const userService = require('./services/userService');
const { getSportConfig, DEFAULT_SPORT } = require('./services/sportConfig');

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
  // Note: io.engine.use() passes raw Node HTTP requests, not Express requests
  // so we need to parse the URL manually instead of using req.query
  skip: (req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.has('sid');
  },
  // Custom key generator for raw Node HTTP requests (not Express requests)
  // Extract IP from X-Forwarded-For (for proxies like Koyeb) or socket address
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.socket?.remoteAddress ||
           'unknown';
  },
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

// ============================================
// Authentication Middleware & REST Endpoints
// ============================================

/**
 * Auth middleware - verifies Supabase JWT and attaches user to request
 * Returns 401 if no valid token is provided
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const user = await authService.authenticateToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

/**
 * GET /api/user/preferences
 * Get the current user's preferences
 */
app.get('/api/user/preferences', requireAuth, async (req, res) => {
  try {
    const preferences = await userService.getPreferences(req.user.id);
    res.json(preferences || {});
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * PATCH /api/user/preferences
 * Update the current user's preferences
 */
app.patch('/api/user/preferences', requireAuth, async (req, res) => {
  try {
    const { preferredNickname, theme, notificationSound } = req.body;
    const updated = await userService.updatePreferences(req.user.id, {
      preferredNickname,
      theme,
      notificationSound,
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating preferences:', error);
    if (error.message.includes('must be')) {
      // Validation error
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
});

/**
 * GET /api/user/recent-rooms
 * Get the current user's recent rooms for quick rejoin
 */
app.get('/api/user/recent-rooms', requireAuth, async (req, res) => {
  try {
    const recentRooms = await userService.getRecentRooms(req.user.id);
    res.json(recentRooms);
  } catch (error) {
    console.error('Error getting recent rooms:', error);
    res.status(500).json({ error: 'Failed to get recent rooms' });
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Authenticate if token provided (optional - guests don't have tokens)
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const user = await authService.authenticateToken(token);
      if (user) {
        socket.authenticatedUser = user;
        console.log(`Authenticated user: ${user.email || user.id}`);
      }
    } catch (error) {
      // Invalid token - continue as guest (don't block connection)
      console.log('Invalid auth token, continuing as guest');
    }
  }

  // Handle joining a room (now async for database operations)
  socket.on('join-room', async (data) => {
    try {
      const { roomId, nickname, sessionId: clientSessionId, sportType } = data;

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

      // Validate and sanitize sport type (if provided)
      let sanitizedSportType = DEFAULT_SPORT;
      if (sportType) {
        const sportValidation = validation.validateSportType(sportType);
        if (!sportValidation.valid) {
          socket.emit('error', { message: sportValidation.error });
          return;
        }
        sanitizedSportType = sportValidation.sanitized;
      }

      const sanitizedRoomId = roomValidation.sanitized;
      const sanitizedNickname = nicknameValidation.sanitized;

      // Get or create session in database (pass sport type for new rooms)
      const { session, room: dbRoom, isReconnect } = await sessionManager.getOrCreateSession(
        sanitizedRoomId,
        sanitizedNickname,
        clientSessionId,
        sanitizedSportType
      );

      // Use the room's sport type (first joiner sets it, subsequent joiners use existing)
      const effectiveSportType = dbRoom.sportType || DEFAULT_SPORT;

      // Connect session (update socket ID in database)
      await sessionManager.connectSession(session.id, socket.id);

      // If user is authenticated, link session to their account and track room
      if (socket.authenticatedUser) {
        await userService.linkSessionToUser(session.id, socket.authenticatedUser.id);
        await userService.trackRecentRoom(
          socket.authenticatedUser.id,
          sanitizedRoomId,
          sanitizedNickname,
          effectiveSportType  // Phase 8: Track sport type
        );
      }

      // Load message history from database and initialize room with sport type
      const dbMessages = await roomManager.loadMessagesFromDb(dbRoom.id);
      roomManager.initializeRoom(sanitizedRoomId, dbRoom.id, dbMessages, effectiveSportType);

      // Store sport type on socket for sync-game-time
      socket.sportType = effectiveSportType;

      // Get restored game time if reconnecting
      let restoredGameTime = null;
      if (isReconnect) {
        restoredGameTime = await sessionManager.getSessionGameTime(session.id);
        if (restoredGameTime) {
          console.log(`[Session] Restoring game time for ${sanitizedNickname}: Q${restoredGameTime.quarter} ${restoredGameTime.minutes}:${restoredGameTime.seconds}`);
        }
      }

      // Join the Socket.IO room
      socket.join(sanitizedRoomId);

      // Add user to room manager (with session ID and restored game time)
      const user = roomManager.addUser(
        sanitizedRoomId,
        socket.id,
        sanitizedNickname,
        session.id,
        restoredGameTime
      );

      // Store room info on socket for easy access
      socket.roomId = sanitizedRoomId;
      socket.nickname = sanitizedNickname;
      socket.sessionId = session.id;

      // Get current room state
      const messages = roomManager.getRoomMessages(sanitizedRoomId);
      const users = roomManager.getRoomUsers(sanitizedRoomId);

      // Build sync state for reconnecting users
      let syncState = null;
      if (restoredGameTime) {
        syncState = {
          period: restoredGameTime.period ?? restoredGameTime.quarter,  // Support both for backwards compat
          minutes: restoredGameTime.minutes,
          seconds: restoredGameTime.seconds,
          offset: user.offset,
          offsetFormatted: require('./services/timeUtils').formatOffset(user.offset),
          isBaseline: user.offset === 0
        };
      }

      // Get sport config to send to frontend
      const sportConfig = getSportConfig(effectiveSportType);

      // Send confirmation to the joining user
      socket.emit('joined-room', {
        roomId: sanitizedRoomId,
        nickname: sanitizedNickname,
        users,
        messages,
        sessionId: session.id,  // Send session ID for client storage
        isReconnect,
        syncState,  // Restored sync state (null if new user)
        // Sport info (Phase 8)
        sportType: effectiveSportType,
        sportConfig: {
          periods: sportConfig.periods,
          periodLabel: sportConfig.periodLabel,
          periodLabelShort: sportConfig.periodLabelShort,
          periodDurationMinutes: sportConfig.periodDurationMinutes,
          clockDirection: sportConfig.clockDirection,
          maxMinutes: sportConfig.maxMinutes
        }
      });

      // Notify others in the room (include sync status)
      const isSynced = restoredGameTime !== null;
      socket.to(sanitizedRoomId).emit('user-joined', {
        id: socket.id,
        nickname: sanitizedNickname,
        isSynced,
        offset: user.offset,
        offsetFormatted: isSynced ? require('./services/timeUtils').formatOffset(user.offset) : 'Not synced'
      });

      console.log(`${sanitizedNickname} ${isReconnect ? 'reconnected to' : 'joined'} room: ${sanitizedRoomId}`);
    } catch (error) {
      console.error('Error in join-room:', error);
      socket.emit('error', { message: 'Failed to join room. Please try again.' });
    }
  });

  // Handle game time synchronization
  socket.on('sync-game-time', async (data) => {
    try {
      // Accept both 'period' (new) and 'quarter' (backwards compat) from client
      const period = data.period ?? data.quarter;
      const { minutes, seconds } = data;
      const roomId = socket.roomId;
      const nickname = socket.nickname;
      const sessionId = socket.sessionId;
      const sportType = socket.sportType || DEFAULT_SPORT;

      // Validate user is in a room
      if (!roomId || !nickname) {
        socket.emit('error', { message: 'You must join a room first' });
        return;
      }

      // Update user's game time and calculate offset (uses room's sport type)
      const result = roomManager.updateUserGameTime(
        roomId,
        socket.id,
        period,
        minutes,
        seconds
      );

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      // Persist game time to database (async, non-blocking)
      if (sessionId) {
        sessionManager.updateSessionGameTime(
          sessionId,
          { period, minutes, seconds },
          result.elapsedSeconds
        ).catch(err => {
          console.error(`Failed to persist game time for ${nickname}:`, err.message);
        });
      }

      // Send confirmation to the user with their offset
      socket.emit('sync-confirmed', {
        period,
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

      // Get display format for logging
      const timeUtils = require('./services/timeUtils');
      const displayTime = timeUtils.elapsedSecondsToGameTime(result.elapsedSeconds, sportType);
      console.log(`${nickname} synced in ${roomId}: ${displayTime.display} (${sportType}) - ${result.offsetFormatted}`);
    } catch (error) {
      console.error('Error in sync-game-time:', error);
      socket.emit('error', { message: 'Failed to sync game time. Please try again.' });
    }
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const { content } = data;
    const roomId = socket.roomId;
    const nickname = socket.nickname;
    const sessionId = socket.sessionId;

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
    // Now also persists to database asynchronously
    roomManager.addMessage(roomId, message, sessionId);

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
  socket.on('disconnect', async () => {
    const roomId = socket.roomId;
    const nickname = socket.nickname;
    const sessionId = socket.sessionId;

    // Clear any queued messages for this user (they won't receive them)
    const clearedCount = messageQueue.clearUserQueue(socket.id);
    if (clearedCount > 0) {
      console.log(`[MessageQueue] Cleared ${clearedCount} queued messages for ${nickname || socket.id}`);
    }

    // Clear rate limiter data for this user
    rateLimiter.clearUser(socket.id);

    // Mark session as disconnected in database (but keep it active for reconnection)
    if (sessionId) {
      sessionManager.disconnectSession(sessionId).catch(err => {
        console.error(`Failed to disconnect session for ${nickname}:`, err.message);
      });
    }

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

// Database cleanup - expire disconnected sessions and clean old data
// Run every 5 minutes
setInterval(async () => {
  try {
    await sessionManager.expireDisconnectedSessions();
  } catch (error) {
    console.error('[Cleanup] Error expiring sessions:', error.message);
  }
}, 5 * 60 * 1000);

// Deep cleanup - delete old sessions and inactive rooms
// Run once per day
setInterval(async () => {
  try {
    await sessionManager.cleanupOldData(7); // Delete data older than 7 days
  } catch (error) {
    console.error('[Cleanup] Error cleaning old data:', error.message);
  }
}, 24 * 60 * 60 * 1000);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for: ${CORS_ORIGIN}`);
});
