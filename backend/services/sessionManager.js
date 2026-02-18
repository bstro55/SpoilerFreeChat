/**
 * Session Manager Service
 *
 * Handles user session persistence for reconnection support.
 * When a user refreshes the page or briefly disconnects, they can
 * resume their session (same nickname, same sync state) instead of
 * appearing as a new user.
 *
 * Key concepts:
 * - Session: A user's presence in a room (persisted to database)
 * - Socket: The live WebSocket connection (in-memory only)
 * - A session can exist without an active socket (disconnected but resumable)
 *
 * Reconnection window: 1 hour
 * After that, the session is considered expired and user joins fresh.
 */

const prisma = require('./database');
const { withRetry } = require('./database');
const logger = require('./logger');

// How long a disconnected session remains valid for reconnection
const RECONNECT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get or create a session for a user joining a room.
 *
 * If the user has a recent active session with the same nickname in
 * the same room, we reconnect them to it. Otherwise, we create a new session.
 *
 * @param {string} roomCode - The room identifier
 * @param {string} nickname - The user's display name
 * @param {string|null} existingSessionId - Session ID from client (if reconnecting)
 * @param {string} sportType - Sport type for new rooms (Phase 8)
 * @param {Object|null} roomMetadata - Optional room metadata for new rooms (Phase 11)
 * @param {string|null} roomMetadata.roomName - Display name for the room
 * @param {string|null} roomMetadata.teams - Teams playing (e.g., "Lakers vs Celtics")
 * @param {Date|null} roomMetadata.gameDate - Date of the game
 * @returns {Promise<{session: Object, room: Object, isReconnect: boolean}>}
 */
async function getOrCreateSession(roomCode, nickname, existingSessionId = null, sportType = 'basketball', roomMetadata = null) {
  // First, ensure the room exists (create if it doesn't)
  // First joiner's sport type and metadata is used; existing rooms keep their values
  const room = await prisma.room.upsert({
    where: { roomCode },
    create: {
      roomCode,
      sportType,
      // Include room metadata if provided
      ...(roomMetadata && {
        roomName: roomMetadata.roomName || null,
        teams: roomMetadata.teams || null,
        gameDate: roomMetadata.gameDate || null
      })
    },
    update: { lastActivityAt: new Date() }  // Don't change metadata for existing rooms
  });

  // If client provided a session ID, try to reconnect to it
  if (existingSessionId) {
    const existingSession = await prisma.session.findFirst({
      where: {
        id: existingSessionId,
        roomId: room.id,
        nickname: nickname,
        isActive: true,
        // Only reconnect if last seen within the reconnection window
        lastSeenAt: { gt: new Date(Date.now() - RECONNECT_WINDOW_MS) }
      }
    });

    if (existingSession) {
      logger.info(`[Session] Reconnecting ${nickname} to existing session in room ${roomCode}`);
      return { session: existingSession, room, isReconnect: true };
    }
  }

  // Check if there's already an active session with this nickname in this room
  // (handles case where user refreshes without sending sessionId)
  const existingByNickname = await prisma.session.findFirst({
    where: {
      roomId: room.id,
      nickname: nickname,
      isActive: true,
      lastSeenAt: { gt: new Date(Date.now() - RECONNECT_WINDOW_MS) }
    }
  });

  if (existingByNickname) {
    logger.info(`[Session] Found existing session for ${nickname} in room ${roomCode} by nickname`);
    return { session: existingByNickname, room, isReconnect: true };
  }

  // No existing active session found - upsert (update or create)
  // This handles the unique constraint on (roomId, nickname) by reactivating
  // any existing inactive session rather than trying to create a duplicate
  const session = await prisma.session.upsert({
    where: {
      roomId_nickname: {
        roomId: room.id,
        nickname: nickname
      }
    },
    update: {
      isActive: true,
      lastSeenAt: new Date(),
      currentSocketId: null // Will be set by connectSession
    },
    create: {
      roomId: room.id,
      nickname: nickname,
      isActive: true
    }
  });

  logger.info(`[Session] Created/reactivated session for ${nickname} in room ${roomCode}`);
  return { session, room, isReconnect: false };
}

/**
 * Update session with current socket ID (marks user as connected)
 *
 * @param {string} sessionId - The session ID
 * @param {string} socketId - The current socket ID
 */
async function connectSession(sessionId, socketId) {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      currentSocketId: socketId,
      lastSeenAt: new Date(),
      isActive: true
    }
  });
}

/**
 * Mark session as disconnected (but still resumable)
 * Called when socket disconnects - session remains active for reconnection window
 *
 * @param {string} sessionId - The session ID
 */
async function disconnectSession(sessionId) {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      currentSocketId: null,
      lastSeenAt: new Date()
      // Note: isActive stays true - session is still resumable
    }
  });
}

/**
 * Update session's game time sync data
 * Called when user syncs their game time
 *
 * @param {string} sessionId - The session ID
 * @param {Object} gameTime - { period, minutes, seconds } (accepts 'quarter' for backwards compat)
 * @param {number} elapsedSeconds - Calculated elapsed seconds
 */
async function updateSessionGameTime(sessionId, gameTime, elapsedSeconds) {
  // Support both 'period' (new) and 'quarter' (backwards compat)
  const period = gameTime.period ?? gameTime.quarter;

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      gameTimeQuarter: period,  // Column name kept for backwards compat, but stores period
      gameTimeMinutes: gameTime.minutes,
      gameTimeSeconds: gameTime.seconds,
      elapsedSeconds: elapsedSeconds,
      lastSeenAt: new Date()
    }
  });
}

/**
 * Get a session's stored game time (for reconnection)
 *
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object|null>} Game time data or null if not synced
 */
async function getSessionGameTime(sessionId) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      gameTimeQuarter: true,
      gameTimeMinutes: true,
      gameTimeSeconds: true,
      elapsedSeconds: true
    }
  });

  if (!session || session.gameTimeQuarter === null) {
    return null;
  }

  // Return as 'period' (new name) but also include 'quarter' for backwards compat
  return {
    period: session.gameTimeQuarter,  // New name
    quarter: session.gameTimeQuarter, // Backwards compat
    minutes: session.gameTimeMinutes,
    seconds: session.gameTimeSeconds,
    elapsedSeconds: session.elapsedSeconds
  };
}

/**
 * Find session by socket ID
 *
 * @param {string} socketId - The socket ID
 * @returns {Promise<Object|null>} Session or null
 */
async function findSessionBySocketId(socketId) {
  return prisma.session.findFirst({
    where: { currentSocketId: socketId },
    include: { room: true }
  });
}

/**
 * Mark session as fully inactive (no longer resumable)
 * Called after reconnection window expires
 *
 * @param {string} sessionId - The session ID
 */
async function deactivateSession(sessionId) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { isActive: false }
  });
}

/**
 * Clean up old sessions and rooms
 * Should be called periodically (e.g., daily)
 *
 * @param {number} maxAgeDays - Delete sessions older than this many days
 */
async function cleanupOldData(maxAgeDays = 7) {
  const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

  // Delete inactive sessions older than cutoff
  const deletedSessions = await prisma.session.deleteMany({
    where: {
      isActive: false,
      lastSeenAt: { lt: cutoffDate }
    }
  });

  // Delete rooms with no recent activity and no active sessions
  const deletedRooms = await prisma.room.deleteMany({
    where: {
      lastActivityAt: { lt: cutoffDate },
      sessions: { none: { isActive: true } }
    }
  });

  if (deletedSessions.count > 0 || deletedRooms.count > 0) {
    logger.info(`[Cleanup] Deleted ${deletedSessions.count} old sessions and ${deletedRooms.count} inactive rooms`);
  }

  return { deletedSessions: deletedSessions.count, deletedRooms: deletedRooms.count };
}

/**
 * Mark sessions as inactive if disconnected too long
 * Should be called periodically (e.g., every 5 minutes)
 */
async function expireDisconnectedSessions() {
  const expireBefore = new Date(Date.now() - RECONNECT_WINDOW_MS);

  try {
    const expired = await withRetry(() => prisma.session.updateMany({
      where: {
        currentSocketId: null,  // Not connected
        isActive: true,
        lastSeenAt: { lt: expireBefore }
      },
      data: { isActive: false }
    }));

    if (expired.count > 0) {
      logger.info(`[Session] Expired ${expired.count} disconnected sessions`);
    }

    return expired.count;
  } catch (error) {
    // Log but don't crash - cleanup is non-critical
    logger.error('[Cleanup] Error expiring sessions (will retry next cycle):', error.message);
    return 0;
  }
}

/**
 * Check if a room with the given code exists in the database.
 * Used to validate "join by code" attempts before creating a session.
 *
 * @param {string} roomCode - The room code to look up
 * @returns {Promise<boolean>} True if the room exists
 */
async function checkRoomExists(roomCode) {
  const room = await prisma.room.findUnique({ where: { roomCode } });
  return !!room;
}

module.exports = {
  getOrCreateSession,
  connectSession,
  disconnectSession,
  updateSessionGameTime,
  getSessionGameTime,
  findSessionBySocketId,
  deactivateSession,
  cleanupOldData,
  expireDisconnectedSessions,
  checkRoomExists,
  RECONNECT_WINDOW_MS
};
