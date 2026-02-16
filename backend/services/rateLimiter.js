/**
 * Rate Limiter Service
 *
 * Implements per-user message rate limiting using a sliding window approach.
 * Tracks message timestamps and rejects messages if the user exceeds the limit.
 *
 * Configuration:
 * - MAX_MESSAGES: Maximum messages allowed in the time window
 * - WINDOW_MS: Time window in milliseconds (default: 1 minute)
 */

// Rate limit configuration
const MAX_MESSAGES = 10;        // 10 messages per window
const WINDOW_MS = 60 * 1000;    // 1 minute window

// Map of socketId -> array of message timestamps
const messageTimes = new Map();

// Join room rate limiting (per IP to prevent room enumeration)
const MAX_JOIN_ATTEMPTS = 10;   // 10 join attempts per window
const JOIN_WINDOW_MS = 60 * 1000; // 1 minute window
const joinAttempts = new Map(); // Map of IP -> array of attempt timestamps

/**
 * Check if a user can send a message (and record the attempt if allowed)
 * @param {string} socketId - The user's socket ID
 * @returns {Object} { allowed: boolean, remaining: number, retryAfter?: number }
 */
function checkRateLimit(socketId) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Get existing timestamps for this user
  let timestamps = messageTimes.get(socketId) || [];

  // Filter out timestamps outside the current window
  timestamps = timestamps.filter(time => time > windowStart);

  // Check if user has exceeded the limit
  if (timestamps.length >= MAX_MESSAGES) {
    // Calculate when the oldest message in the window will expire
    const oldestTimestamp = timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfter  // seconds until user can send again
    };
  }

  // Allow the message and record the timestamp
  timestamps.push(now);
  messageTimes.set(socketId, timestamps);

  return {
    allowed: true,
    remaining: MAX_MESSAGES - timestamps.length
  };
}

/**
 * Clear rate limit data for a user (on disconnect)
 * @param {string} socketId - The user's socket ID
 */
function clearUser(socketId) {
  messageTimes.delete(socketId);
}

/**
 * Get current rate limit status for a user (without recording a message)
 * @param {string} socketId - The user's socket ID
 * @returns {Object} { messagesUsed: number, remaining: number }
 */
function getStatus(socketId) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = messageTimes.get(socketId) || [];
  timestamps = timestamps.filter(time => time > windowStart);

  return {
    messagesUsed: timestamps.length,
    remaining: MAX_MESSAGES - timestamps.length
  };
}

/**
 * Check if an IP can attempt to join a room (prevents room code enumeration)
 * @param {string} ip - The client's IP address
 * @returns {Object} { allowed: boolean, retryAfter?: number }
 */
function checkJoinRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - JOIN_WINDOW_MS;

  // Get existing timestamps for this IP
  let attempts = joinAttempts.get(ip) || [];

  // Filter out timestamps outside the current window
  attempts = attempts.filter(time => time > windowStart);

  // Check if IP has exceeded the limit
  if (attempts.length >= MAX_JOIN_ATTEMPTS) {
    const oldestAttempt = attempts[0];
    const retryAfter = Math.ceil((oldestAttempt + JOIN_WINDOW_MS - now) / 1000);

    return {
      allowed: false,
      retryAfter // seconds until IP can try again
    };
  }

  // Allow the attempt and record the timestamp
  attempts.push(now);
  joinAttempts.set(ip, attempts);

  return { allowed: true };
}

/**
 * Clear join attempt data for an IP (optional cleanup)
 * @param {string} ip - The client's IP address
 */
function clearJoinAttempts(ip) {
  joinAttempts.delete(ip);
}

module.exports = {
  checkRateLimit,
  clearUser,
  getStatus,
  checkJoinRateLimit,
  clearJoinAttempts,
  // Export config for testing/documentation
  MAX_MESSAGES,
  WINDOW_MS,
  MAX_JOIN_ATTEMPTS,
  JOIN_WINDOW_MS
};
