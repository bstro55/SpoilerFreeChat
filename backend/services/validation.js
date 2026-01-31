/**
 * Input Validation Service
 *
 * Provides validation and sanitization for user inputs.
 * Uses the 'validator' library for robust validation.
 *
 * Security considerations:
 * - XSS is primarily handled by React's default escaping on the frontend
 * - We still sanitize inputs server-side as defense in depth
 * - Never trust client-side validation alone
 */

const validator = require('validator');
const Filter = require('bad-words');

// Initialize profanity filter
// This blocks offensive words in nicknames
const profanityFilter = new Filter();

// Helper function to check for profanity as substrings (catches "asshat", "dumbass", etc.)
// Only checks compound words where bad word is at very START or END of nickname
// This avoids false positives like "Bassist" or "Classic"
function containsProfanity(text) {
  const lowerText = text.toLowerCase();

  return profanityFilter.list.some(badWord => {
    if (badWord.length >= 4) {
      // Longer words: match anywhere
      return lowerText.includes(badWord);
    }

    // Short words: only at very start or very end, with something attached
    // "asshat" → starts with "ass" + more ✓
    // "dumbass" → ends with "ass" after more ✓
    // "Bassist" → "ass" in middle ✗
    // "Bass" → just "ass" at end, nothing before ✗
    const startsWithBadWord = lowerText.startsWith(badWord) && lowerText.length > badWord.length;
    const endsWithBadWord = lowerText.endsWith(badWord) && lowerText.length > badWord.length + 2;

    return startsWithBadWord || endsWithBadWord;
  });
}

/**
 * Validate and sanitize a nickname
 * - Must be 1-30 characters
 * - Only allows letters, numbers, spaces, underscores, and hyphens
 * - Trims whitespace from ends
 *
 * @param {string} nickname - Raw nickname input
 * @returns {Object} { valid: boolean, sanitized?: string, error?: string }
 */
function validateNickname(nickname) {
  // Check if nickname exists and is a string
  if (typeof nickname !== 'string') {
    return { valid: false, error: 'Nickname must be a string' };
  }

  // Trim and check length
  const trimmed = nickname.trim();

  if (trimmed.length < 1) {
    return { valid: false, error: 'Nickname is required' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Nickname must be 30 characters or less' };
  }

  // Only allow alphanumeric, spaces, underscores, and hyphens
  // This prevents injection attacks and keeps nicknames readable
  const validPattern = /^[a-zA-Z0-9 _-]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Nickname can only contain letters, numbers, spaces, underscores, and hyphens'
    };
  }

  // Check for profanity (generic error message to not reveal filter words)
  // Uses both exact match (isProfane) and substring match (containsProfanity)
  // to catch compound words like "asshat" or "dumbass"
  if (profanityFilter.isProfane(trimmed) || containsProfanity(trimmed)) {
    return { valid: false, error: 'Please choose a different nickname' };
  }

  // Escape any HTML entities (defense in depth)
  const sanitized = validator.escape(trimmed);

  return { valid: true, sanitized };
}

/**
 * Validate and sanitize a chat message
 * - Must be 1-500 characters
 * - Trims whitespace from ends
 * - Escapes HTML entities
 *
 * @param {string} content - Raw message content
 * @returns {Object} { valid: boolean, sanitized?: string, error?: string }
 */
function validateMessage(content) {
  // Check if content exists and is a string
  if (typeof content !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }

  // Trim and check length
  const trimmed = content.trim();

  if (trimmed.length < 1) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: 'Message must be 500 characters or less' };
  }

  // Escape HTML entities to prevent XSS
  // Note: React also escapes by default, but this is defense in depth
  const sanitized = validator.escape(trimmed);

  return { valid: true, sanitized };
}

/**
 * Validate a room ID
 * - Must be 1-50 characters
 * - Only allows alphanumeric, hyphens, and underscores
 *
 * @param {string} roomId - Raw room ID input
 * @returns {Object} { valid: boolean, sanitized?: string, error?: string }
 */
function validateRoomId(roomId) {
  // Check if roomId exists and is a string
  if (typeof roomId !== 'string') {
    return { valid: false, error: 'Room ID must be a string' };
  }

  // Trim and check length
  const trimmed = roomId.trim().toLowerCase();

  if (trimmed.length < 1) {
    return { valid: false, error: 'Room ID is required' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Room ID must be 50 characters or less' };
  }

  // Only allow alphanumeric, hyphens, and underscores
  // No spaces in room IDs for cleaner URLs later
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Room ID can only contain letters, numbers, hyphens, and underscores'
    };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate game time values
 * - Quarter: 1-4
 * - Minutes: 0-12
 * - Seconds: 0-59
 * - Special case: 12:XX only valid when seconds is 0
 *
 * @param {number} quarter - Quarter number
 * @param {number} minutes - Minutes on clock
 * @param {number} seconds - Seconds on clock
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateGameTime(quarter, minutes, seconds) {
  // Ensure all values are numbers
  const q = parseInt(quarter, 10);
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);

  if (isNaN(q) || isNaN(m) || isNaN(s)) {
    return { valid: false, error: 'Game time values must be numbers' };
  }

  if (q < 1 || q > 4) {
    return { valid: false, error: 'Quarter must be 1-4' };
  }

  if (m < 0 || m > 12) {
    return { valid: false, error: 'Minutes must be 0-12' };
  }

  if (s < 0 || s > 59) {
    return { valid: false, error: 'Seconds must be 0-59' };
  }

  // 12:XX is only valid when seconds is 0 (quarter start)
  if (m === 12 && s > 0) {
    return { valid: false, error: 'Time cannot exceed 12:00' };
  }

  return { valid: true };
}

module.exports = {
  validateNickname,
  validateMessage,
  validateRoomId,
  validateGameTime
};
