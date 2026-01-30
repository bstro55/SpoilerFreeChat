/**
 * Room Manager Service
 *
 * Manages in-memory state for chat rooms, users, and messages.
 * This is ephemeral storage - data is lost on server restart.
 *
 * Data Structures:
 * - rooms: Map<roomId, Room>
 * - Room: { users: Map<socketId, User>, messages: Array<Message> }
 * - User: { id, nickname, joinedAt }
 * - Message: { id, senderId, nickname, content, timestamp }
 */

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
    joinedAt: Date.now()
  });
}

/**
 * Remove a user from a room
 * @param {string} roomId - The room identifier
 * @param {string} socketId - The user's socket ID
 */
function removeUser(roomId, socketId) {
  const room = rooms.get(roomId);
  if (room) {
    room.users.delete(socketId);

    // Clean up empty rooms to prevent memory leaks
    if (room.users.size === 0) {
      rooms.delete(roomId);
    }
  }
}

/**
 * Get all users in a room
 * @param {string} roomId - The room identifier
 * @returns {Array} Array of user objects
 */
function getRoomUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];

  // Convert Map to array for easier use on frontend
  return Array.from(room.users.values());
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
      messageCount: room.messages.length
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
  getStats
};
