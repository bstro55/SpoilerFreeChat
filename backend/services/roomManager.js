/**
 * Room Manager Service
 *
 * Manages HYBRID state for chat rooms, users, and messages.
 * - In-memory: Active connections, offsets, message queues (real-time performance)
 * - Database: Rooms, messages, sessions (persistence across restarts)
 *
 * Data Structures (In-Memory):
 * - rooms: Map<roomId, Room>
 * - Room: {
 *     users: Map<socketId, User>,
 *     messages: Array<Message>,  // Recent messages cache
 *     createdAt: number,
 *     dbId: string | null,       // Database ID for the room
 *     sportType: string          // Sport type (Phase 8)
 *   }
 * - User: {
 *     id: string,                // Socket ID
 *     sessionId: string,         // Database session ID (for persistence)
 *     nickname: string,
 *     joinedAt: number,
 *     gameTime: { period, minutes, seconds } | null,  // 'period' instead of 'quarter' for multi-sport
 *     elapsedSeconds: number | null,
 *     offset: number
 *   }
 * - Message: { id, senderId, nickname, content, timestamp }
 *
 * OFFSET CALCULATION (unchanged - sport-agnostic):
 * Based purely on elapsed GAME TIME, not real-world time.
 * 1. Convert each user's game time to elapsed seconds (sport-aware)
 * 2. Find the MAX elapsed time (most advanced user = "live")
 * 3. Each user's offset = (max elapsed - their elapsed) * 1000ms
 *
 * Updated in Phase 8 to support multiple sports.
 */

const timeUtils = require('./timeUtils');
const prisma = require('./database');
const { DEFAULT_SPORT } = require('./sportConfig');
const logger = require('./logger');

// Maximum number of messages to keep in room history (in-memory cache)
const MAX_MESSAGES_PER_ROOM = 50;

// In-memory storage for all rooms
const rooms = new Map();

/**
 * Get or create a room by ID (in-memory only)
 * For database persistence, use initializeRoom() instead
 *
 * @param {string} roomId - The room identifier
 * @returns {Object} The room object
 */
function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      messages: [],
      createdAt: Date.now(),
      dbId: null,  // Will be set when synced with database
      sportType: DEFAULT_SPORT  // Default to basketball for backwards compatibility
    });
  }
  return rooms.get(roomId);
}

/**
 * Initialize a room with database state
 * Called when first user joins a room to load persisted data
 *
 * @param {string} roomId - The room identifier (roomCode)
 * @param {string} dbRoomId - The database ID for the room
 * @param {Array} messages - Recent messages from database
 * @param {string} sportType - The sport type for this room (Phase 8)
 */
function initializeRoom(roomId, dbRoomId, messages = [], sportType = DEFAULT_SPORT) {
  const room = getRoom(roomId);
  room.dbId = dbRoomId;
  room.sportType = sportType;  // Set sport type from database

  // Load messages from database into memory (if not already loaded)
  if (room.messages.length === 0 && messages.length > 0) {
    room.messages = messages.map(m => ({
      id: m.id,
      senderId: m.sessionId || 'unknown',
      nickname: m.senderNickname,
      content: m.content,
      timestamp: m.timestamp.getTime()
    }));
    logger.debug({ roomId, messageCount: messages.length }, 'Loaded messages from database');
  }

  logger.debug({ roomId, sportType }, 'Room initialized');
  return room;
}

/**
 * Load recent messages from database for a room
 *
 * @param {string} dbRoomId - The database room ID
 * @param {number} limit - Max messages to load
 * @returns {Promise<Array>} Array of message objects
 */
async function loadMessagesFromDb(dbRoomId, limit = MAX_MESSAGES_PER_ROOM) {
  const messages = await prisma.message.findMany({
    where: { roomId: dbRoomId },
    orderBy: { timestamp: 'desc' },
    take: limit
  });

  // Reverse to get oldest first (chronological order)
  return messages.reverse();
}

/**
 * Add a user to a room
 *
 * @param {string} roomId - The room identifier
 * @param {string} socketId - The user's socket ID
 * @param {string} nickname - The user's display name
 * @param {string} sessionId - The database session ID
 * @param {Object|null} restoredGameTime - Game time to restore (for reconnection)
 */
function addUser(roomId, socketId, nickname, sessionId = null, restoredGameTime = null) {
  const room = getRoom(roomId);

  const user = {
    id: socketId,
    sessionId: sessionId,
    nickname,
    joinedAt: Date.now(),
    // Game time sync fields - null until user syncs (or restored)
    // Uses 'period' as generic term (works for quarters, periods, halves)
    gameTime: restoredGameTime ? {
      period: restoredGameTime.period ?? restoredGameTime.quarter,  // Support both for backwards compat
      minutes: restoredGameTime.minutes,
      seconds: restoredGameTime.seconds
    } : null,
    elapsedSeconds: restoredGameTime ? restoredGameTime.elapsedSeconds : null,
    offset: 0  // Will be recalculated if gameTime is restored
  };

  room.users.set(socketId, user);

  // If restoring game time, recalculate offsets
  if (restoredGameTime) {
    recalculateOffsets(roomId);
  }

  return user;
}

/**
 * Recalculate all user offsets based on game time.
 * Called whenever a user syncs or resyncs.
 *
 * @param {string} roomId - The room identifier
 * @returns {Object} { maxElapsed, updatedUsers: Map<socketId, newOffset> }
 */
function recalculateOffsets(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { maxElapsed: 0, updatedUsers: new Map() };

  // Find all synced users and their elapsed times
  const syncedUsers = [];
  for (const [socketId, user] of room.users) {
    if (user.elapsedSeconds !== null) {
      syncedUsers.push({ socketId, user });
    }
  }

  if (syncedUsers.length === 0) {
    return { maxElapsed: 0, updatedUsers: new Map() };
  }

  // Find the maximum elapsed time (most advanced user = live)
  let maxElapsed = 0;
  for (const { user } of syncedUsers) {
    if (user.elapsedSeconds > maxElapsed) {
      maxElapsed = user.elapsedSeconds;
    }
  }

  // Recalculate all offsets: offset = (maxElapsed - userElapsed) * 1000ms
  const updatedUsers = new Map();
  for (const { socketId, user } of syncedUsers) {
    const newOffset = (maxElapsed - user.elapsedSeconds) * 1000;
    if (user.offset !== newOffset) {
      user.offset = newOffset;
      updatedUsers.set(socketId, {
        offset: newOffset,
        offsetFormatted: timeUtils.formatOffset(newOffset)
      });
    }
  }

  return { maxElapsed, updatedUsers };
}

/**
 * Update a user's game time and recalculate all offsets
 *
 * @param {string} roomId - The room identifier
 * @param {string} socketId - The user's socket ID
 * @param {number} period - Current period (1-based: quarter, period, half depending on sport)
 * @param {number} minutes - Minutes on clock
 * @param {number} seconds - Seconds on clock (0-59)
 * @returns {Object} { success, offset, offsetFormatted, isBaseline, error?, updatedUsers? }
 */
function updateUserGameTime(roomId, socketId, period, minutes, seconds) {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  const user = room.users.get(socketId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Get sport type for this room (for validation and conversion)
  const sportType = room.sportType || DEFAULT_SPORT;

  // Validate the game time input using sport-specific rules
  const validation = timeUtils.validateGameTime(period, minutes, seconds, sportType);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Store the game time (using generic 'period' for all sports)
  user.gameTime = { period, minutes, seconds };

  // Calculate elapsed seconds from game start using sport-specific conversion
  const elapsedSeconds = timeUtils.gameTimeToElapsedSeconds(period, minutes, seconds, sportType);
  user.elapsedSeconds = elapsedSeconds;

  // Get display format for logging
  const displayTime = timeUtils.elapsedSecondsToGameTime(elapsedSeconds, sportType);

  // Recalculate all offsets
  const { maxElapsed, updatedUsers } = recalculateOffsets(roomId);

  const isBaseline = user.elapsedSeconds === maxElapsed;

  logger.debug({
    roomId,
    nickname: user.nickname,
    gameTime: displayTime.display,
    sportType,
    elapsedSeconds,
    offset: user.offset,
    isBaseline,
    updatedUsersCount: updatedUsers.size
  }, 'User game time synced');

  return {
    success: true,
    offset: user.offset,
    offsetFormatted: timeUtils.formatOffset(user.offset),
    isBaseline,
    elapsedSeconds,  // Include for database persistence
    // Include other users whose offsets changed (for broadcasting updates)
    updatedUsers
  };
}

/**
 * Get a user's current offset
 * @param {string} roomId - The room identifier
 * @param {string} socketId - The user's socket ID
 * @returns {number} Offset in milliseconds
 */
function getUserOffset(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return 0;
  const user = room.users.get(socketId);
  if (!user) return 0;
  return user.offset;
}

/**
 * Check if a user has synced their game time
 * @param {string} roomId - The room identifier
 * @param {string} socketId - The user's socket ID
 * @returns {boolean}
 */
function hasUserSynced(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  const user = room.users.get(socketId);
  return user && user.gameTime !== null;
}

/**
 * Remove a user from a room
 * @param {string} roomId - The room identifier
 * @param {string} socketId - The user's socket ID
 * @returns {Object} { removedUser, updatedUsers } - Users whose offsets may have changed
 */
function removeUser(roomId, socketId) {
  const room = rooms.get(roomId);
  let removedUser = null;
  let updatedUsers = new Map();

  if (room) {
    removedUser = room.users.get(socketId);

    // Check if the removed user was the most advanced (had max elapsed time)
    let wasMaxElapsed = false;
    if (removedUser && removedUser.elapsedSeconds !== null) {
      let maxElapsed = 0;
      for (const user of room.users.values()) {
        if (user.elapsedSeconds !== null && user.elapsedSeconds > maxElapsed) {
          maxElapsed = user.elapsedSeconds;
        }
      }
      wasMaxElapsed = removedUser.elapsedSeconds === maxElapsed;
    }

    room.users.delete(socketId);

    // Clean up empty rooms from memory (but keep in database)
    if (room.users.size === 0) {
      rooms.delete(roomId);
    } else if (wasMaxElapsed) {
      // If the most advanced user left, recalculate for remaining users
      logger.debug({ roomId, nickname: removedUser.nickname }, 'Most advanced user left, recalculating offsets');
      const result = recalculateOffsets(roomId);
      updatedUsers = result.updatedUsers;
    }
  }

  return { removedUser, updatedUsers };
}

/**
 * Get all users in a room
 * @param {string} roomId - The room identifier
 * @returns {Array} Array of user objects (with sync status)
 */
function getRoomUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];

  // Convert Map to array and include sync status
  return Array.from(room.users.values()).map(user => ({
    id: user.id,
    nickname: user.nickname,
    joinedAt: user.joinedAt,
    isSynced: user.gameTime !== null,
    gameTime: user.gameTime,
    offset: user.offset,
    offsetFormatted: timeUtils.formatOffset(user.offset)
  }));
}

/**
 * Add a message to a room's history (in-memory + database)
 *
 * @param {string} roomId - The room identifier
 * @param {Object} message - The message object
 * @param {string|null} sessionId - The sender's session ID (for database)
 */
function addMessage(roomId, message, sessionId = null) {
  const room = getRoom(roomId);

  // Add to in-memory cache immediately (for real-time performance)
  room.messages.push(message);

  // Keep only the last MAX_MESSAGES_PER_ROOM messages in memory
  if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
    room.messages = room.messages.slice(-MAX_MESSAGES_PER_ROOM);
  }

  // Persist to database asynchronously (don't block real-time delivery)
  if (room.dbId) {
    persistMessageToDb(room.dbId, message, sessionId).catch(err => {
      logger.error({ err, roomId }, 'Failed to persist message');
    });
  }
}

/**
 * Persist a message to the database (async, non-blocking)
 *
 * @param {string} dbRoomId - The database room ID
 * @param {Object} message - The message object
 * @param {string|null} sessionId - The sender's session ID
 */
async function persistMessageToDb(dbRoomId, message, sessionId) {
  await prisma.message.create({
    data: {
      roomId: dbRoomId,
      sessionId: sessionId,
      senderNickname: message.nickname,
      content: message.content,
      timestamp: new Date(message.timestamp)
    }
  });
}

/**
 * Get a user from a room
 * @param {string} roomId - The room identifier
 * @param {string} socketId - The user's socket ID
 * @returns {Object|undefined} The user object or undefined
 */
function getUser(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  return room.users.get(socketId);
}

/**
 * Get the room's in-memory messages
 * @param {string} roomId - The room identifier
 * @returns {Array} Array of messages
 */
function getRoomMessages(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.messages;
}

/**
 * Get the sport type for a room
 * @param {string} roomId - The room identifier
 * @returns {string} The sport type (defaults to 'basketball')
 */
function getRoomSportType(roomId) {
  const room = rooms.get(roomId);
  return room?.sportType || DEFAULT_SPORT;
}

/**
 * Get statistics about current server state (useful for debugging)
 * @returns {Object} Server statistics
 */
function getStats() {
  return {
    totalRooms: rooms.size,
    rooms: Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      sportType: room.sportType || DEFAULT_SPORT,
      userCount: room.users.size,
      messageCount: room.messages.length,
      syncedUsers: Array.from(room.users.values()).filter(u => u.gameTime !== null).length
    }))
  };
}

module.exports = {
  getRoom,
  initializeRoom,
  loadMessagesFromDb,
  addUser,
  removeUser,
  getRoomUsers,
  getRoomMessages,
  addMessage,
  getUser,
  getStats,
  // Functions for game time sync
  updateUserGameTime,
  getUserOffset,
  hasUserSynced,
  recalculateOffsets,
  // Sport type (Phase 8)
  getRoomSportType,
  // Constants
  MAX_MESSAGES_PER_ROOM
};
