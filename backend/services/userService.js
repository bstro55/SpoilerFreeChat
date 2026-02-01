/**
 * User Service
 *
 * Handles user preferences and recent rooms for authenticated users.
 * All functions require a valid userId (from authService).
 */

const prisma = require('./database');

// Validation constants
const MAX_NICKNAME_LENGTH = 30;
const MAX_RECENT_ROOMS = 10;
const VALID_THEMES = ['light', 'dark', 'system'];

/**
 * Get user preferences
 *
 * @param {string} userId - The user's ID (from Supabase Auth)
 * @returns {Promise<Object|null>} User preferences or null if not found
 */
async function getPreferences(userId) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferredNickname: true,
      theme: true,
      notificationSound: true,
    },
  });

  return user;
}

/**
 * Update user preferences
 *
 * @param {string} userId - The user's ID
 * @param {Object} preferences - The preferences to update
 * @param {string} [preferences.preferredNickname] - Default nickname
 * @param {string} [preferences.theme] - 'light', 'dark', or 'system'
 * @param {boolean} [preferences.notificationSound] - Sound on/off
 * @returns {Promise<Object>} Updated preferences
 */
async function updatePreferences(userId, preferences) {
  if (!userId) {
    throw new Error('userId is required');
  }

  // Build update object with only valid fields
  const updateData = {};

  // Validate and add preferredNickname
  if (preferences.preferredNickname !== undefined) {
    const nickname = String(preferences.preferredNickname).trim();
    if (nickname.length > MAX_NICKNAME_LENGTH) {
      throw new Error(`Nickname must be ${MAX_NICKNAME_LENGTH} characters or less`);
    }
    // Allow empty string to clear the nickname
    updateData.preferredNickname = nickname || null;
  }

  // Validate and add theme
  if (preferences.theme !== undefined) {
    if (!VALID_THEMES.includes(preferences.theme)) {
      throw new Error(`Theme must be one of: ${VALID_THEMES.join(', ')}`);
    }
    updateData.theme = preferences.theme;
  }

  // Validate and add notificationSound
  if (preferences.notificationSound !== undefined) {
    updateData.notificationSound = Boolean(preferences.notificationSound);
  }

  // Only update if there's something to update
  if (Object.keys(updateData).length === 0) {
    return getPreferences(userId);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      preferredNickname: true,
      theme: true,
      notificationSound: true,
    },
  });

  return user;
}

/**
 * Track a room visit for the user's "recent rooms" list
 *
 * @param {string} userId - The user's ID
 * @param {string} roomCode - The room code (e.g., "lakers-vs-celtics")
 * @param {string} nickname - The nickname used in this room
 * @returns {Promise<void>}
 */
async function trackRecentRoom(userId, roomCode, nickname) {
  if (!userId || !roomCode || !nickname) return;

  // Upsert the recent room entry
  // If it already exists, update the visitedAt and nickname
  await prisma.recentRoom.upsert({
    where: {
      userId_roomCode: { userId, roomCode },
    },
    update: {
      visitedAt: new Date(),
      nickname: nickname,
    },
    create: {
      userId,
      roomCode,
      nickname,
    },
  });

  // Clean up old entries if user has too many
  // Keep only the most recent MAX_RECENT_ROOMS
  await pruneRecentRooms(userId);
}

/**
 * Remove old recent room entries to keep the list manageable
 *
 * @param {string} userId - The user's ID
 */
async function pruneRecentRooms(userId) {
  // Get all recent rooms for the user, ordered by visit time
  const recentRooms = await prisma.recentRoom.findMany({
    where: { userId },
    orderBy: { visitedAt: 'desc' },
    select: { id: true },
  });

  // If we have more than the max, delete the oldest ones
  if (recentRooms.length > MAX_RECENT_ROOMS) {
    const idsToDelete = recentRooms
      .slice(MAX_RECENT_ROOMS)
      .map((room) => room.id);

    await prisma.recentRoom.deleteMany({
      where: { id: { in: idsToDelete } },
    });
  }
}

/**
 * Get user's recent rooms for quick rejoin
 *
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} List of recent rooms, newest first
 */
async function getRecentRooms(userId) {
  if (!userId) return [];

  const recentRooms = await prisma.recentRoom.findMany({
    where: { userId },
    orderBy: { visitedAt: 'desc' },
    take: MAX_RECENT_ROOMS,
    select: {
      roomCode: true,
      nickname: true,
      visitedAt: true,
    },
  });

  return recentRooms;
}

/**
 * Link a session to an authenticated user
 * Called when a logged-in user joins a room
 *
 * @param {string} sessionId - The session ID (from sessionManager)
 * @param {string} userId - The user's ID
 * @returns {Promise<void>}
 */
async function linkSessionToUser(sessionId, userId) {
  if (!sessionId || !userId) return;

  await prisma.session.update({
    where: { id: sessionId },
    data: { userId },
  });
}

/**
 * Get all active sessions for a user
 * Useful for "continue where you left off" feature
 *
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} List of active sessions with room info
 */
async function getUserActiveSessions(userId) {
  if (!userId) return [];

  const sessions = await prisma.session.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      room: {
        select: { roomCode: true },
      },
    },
    orderBy: { lastSeenAt: 'desc' },
  });

  return sessions;
}

module.exports = {
  getPreferences,
  updatePreferences,
  trackRecentRoom,
  getRecentRooms,
  linkSessionToUser,
  getUserActiveSessions,
};
