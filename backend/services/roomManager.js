/**
 * Room Manager Service
 *
 * Manages in-memory state for chat rooms, users, and messages.
 * This is ephemeral storage - data is lost on server restart.
 *
 * Data Structures:
 * - rooms: Map<roomId, Room>
 * - Room: {
 *     users: Map<socketId, User>,
 *     messages: Array<Message>,
 *     createdAt: number
 *   }
 * - User: {
 *     id: string,
 *     nickname: string,
 *     joinedAt: number,
 *     gameTime: { quarter, minutes, seconds } | null,
 *     elapsedSeconds: number | null,  // How many seconds of game have elapsed
 *     offset: number  // Delay in ms relative to most advanced user (0 = live)
 *   }
 * - Message: { id, senderId, nickname, content, timestamp }
 *
 * OFFSET CALCULATION (SIMPLIFIED):
 *
 * The offset is based purely on GAME TIME, not real-world time.
 * This is correct because game clocks don't run 1:1 with real time
 * (timeouts, halftime, commercials, etc.).
 *
 * Algorithm:
 * 1. Convert each user's game time to elapsed seconds
 *    - Q1 12:00 → 0 elapsed (game just started)
 *    - Q1 11:30 → 30 elapsed (30 seconds into Q1)
 * 2. Find the MAX elapsed time (most advanced user = "live")
 * 3. Each user's offset = (max elapsed - their elapsed) * 1000ms
 *
 * Example:
 *   User A at Q1 12:00 → elapsed = 0
 *   User B at Q1 11:30 → elapsed = 30
 *
 *   Max elapsed = 30 (User B is most advanced)
 *   User A offset = (30 - 0) * 1000 = 30,000ms = 30 seconds behind
 *   User B offset = (30 - 30) * 1000 = 0ms = live
 */

const timeUtils = require('./timeUtils');

// Maximum number of messages to keep in room history
const MAX_MESSAGES_PER_ROOM = 50;

// In-memory storage for all rooms
const rooms = new Map();

/**
 * Get or create a room by ID
 * @param {string} roomId - The room identifier
 * @returns {Object} The room object
 */
function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      messages: [],
      createdAt: Date.now()
    });
  }
  return rooms.get(roomId);
}

/**
 * Add a user to a room
 * @param {string} roomId - The room identifier
 * @param {string} socketId - The user's socket ID
 * @param {string} nickname - The user's display name
 */
function addUser(roomId, socketId, nickname) {
  const room = getRoom(roomId);
  room.users.set(socketId, {
    id: socketId,
    nickname,
    joinedAt: Date.now(),
    // Game time sync fields - null until user syncs
    gameTime: null,
    elapsedSeconds: null,
    offset: 0  // Default to 0 (no delay) until synced
  });
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
 * @param {number} quarter - Current quarter (1-4)
 * @param {number} minutes - Minutes on clock (0-12)
 * @param {number} seconds - Seconds on clock (0-59)
 * @returns {Object} { success, offset, offsetFormatted, isBaseline, error?, updatedUsers? }
 */
function updateUserGameTime(roomId, socketId, quarter, minutes, seconds) {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  const user = room.users.get(socketId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Validate the game time input
  const validation = timeUtils.validateGameTime(quarter, minutes, seconds);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Store the game time
  user.gameTime = { quarter, minutes, seconds };

  // Calculate elapsed seconds from game start
  const elapsedSeconds = timeUtils.gameTimeToElapsedSeconds(quarter, minutes, seconds);
  user.elapsedSeconds = elapsedSeconds;

  console.log(`[Room ${roomId}] ${user.nickname} synced at Q${quarter} ${minutes}:${seconds.toString().padStart(2, '0')}`);
  console.log(`  → Elapsed game time: ${elapsedSeconds} seconds`);

  // Recalculate all offsets
  const { maxElapsed, updatedUsers } = recalculateOffsets(roomId);

  const isBaseline = user.elapsedSeconds === maxElapsed;

  console.log(`  → Max elapsed: ${maxElapsed}s, This user's offset: ${user.offset}ms (${timeUtils.formatOffset(user.offset)})`);
  if (updatedUsers.size > 1) {
    console.log(`  → ${updatedUsers.size} users had their offsets recalculated`);
  }

  return {
    success: true,
    offset: user.offset,
    offsetFormatted: timeUtils.formatOffset(user.offset),
    isBaseline,
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

    // Clean up empty rooms to prevent memory leaks
    if (room.users.size === 0) {
      rooms.delete(roomId);
    } else if (wasMaxElapsed) {
      // If the most advanced user left, recalculate for remaining users
      console.log(`[Room ${roomId}] Most advanced user ${removedUser.nickname} left, recalculating offsets`);
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
 * Add a message to a room's history
 * @param {string} roomId - The room identifier
 * @param {Object} message - The message object
 */
function addMessage(roomId, message) {
  const room = getRoom(roomId);
  room.messages.push(message);

  // Keep only the last MAX_MESSAGES_PER_ROOM messages
  if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
    room.messages = room.messages.slice(-MAX_MESSAGES_PER_ROOM);
  }
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
 * Get statistics about current server state (useful for debugging)
 * @returns {Object} Server statistics
 */
function getStats() {
  return {
    totalRooms: rooms.size,
    rooms: Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      userCount: room.users.size,
      messageCount: room.messages.length,
      syncedUsers: Array.from(room.users.values()).filter(u => u.gameTime !== null).length
    }))
  };
}

module.exports = {
  getRoom,
  addUser,
  removeUser,
  getRoomUsers,
  addMessage,
  getUser,
  getStats,
  // Functions for Phase 2
  updateUserGameTime,
  getUserOffset,
  hasUserSynced,
  recalculateOffsets
};
