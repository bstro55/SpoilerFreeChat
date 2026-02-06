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
 *
 * Updated in Phase 8 to support multi-sport validation.
 */

const validator = require('validator');
const Filter = require('bad-words');
const { isValidSportType, getValidSportTypes, getSportConfig, DEFAULT_SPORT } = require('./sportConfig');

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
 * Validate sport type
 *
 * @param {string} sportType - Sport identifier
 * @returns {Object} { valid: boolean, sanitized?: string, error?: string }
 */
function validateSportType(sportType) {
  if (typeof sportType !== 'string') {
    return { valid: false, error: 'Sport type must be a string' };
  }

  const normalized = sportType.toLowerCase().trim();

  if (!isValidSportType(normalized)) {
    const validTypes = getValidSportTypes().join(', ');
    return {
      valid: false,
      error: `Invalid sport type. Must be one of: ${validTypes}`,
    };
  }

  return { valid: true, sanitized: normalized };
}

/**
 * Validate room name (optional display name for the room)
 *
 * @param {string|null|undefined} roomName - Room display name
 * @returns {Object} { valid: boolean, sanitized?: string|null, error?: string }
 */
function validateRoomName(roomName) {
  // Optional field - null/undefined is valid
  if (roomName === null || roomName === undefined || roomName === '') {
    return { valid: true, sanitized: null };
  }

  if (typeof roomName !== 'string') {
    return { valid: false, error: 'Room name must be a string' };
  }

  const trimmed = roomName.trim();

  if (trimmed.length > 100) {
    return { valid: false, error: 'Room name must be 100 characters or less' };
  }

  // Escape HTML entities
  const sanitized = validator.escape(trimmed);

  return { valid: true, sanitized };
}

/**
 * Validate teams field (optional)
 *
 * @param {string|null|undefined} teams - Teams description (e.g., "Lakers vs Celtics")
 * @returns {Object} { valid: boolean, sanitized?: string|null, error?: string }
 */
function validateTeams(teams) {
  // Optional field - null/undefined is valid
  if (teams === null || teams === undefined || teams === '') {
    return { valid: true, sanitized: null };
  }

  if (typeof teams !== 'string') {
    return { valid: false, error: 'Teams must be a string' };
  }

  const trimmed = teams.trim();

  if (trimmed.length > 100) {
    return { valid: false, error: 'Teams must be 100 characters or less' };
  }

  // Escape HTML entities
  const sanitized = validator.escape(trimmed);

  return { valid: true, sanitized };
}

/**
 * Validate game date (optional)
 *
 * @param {string|null|undefined} gameDate - ISO date string or date input value
 * @returns {Object} { valid: boolean, sanitized?: Date|null, error?: string }
 */
function validateGameDate(gameDate) {
  // Optional field - null/undefined is valid
  if (gameDate === null || gameDate === undefined || gameDate === '') {
    return { valid: true, sanitized: null };
  }

  if (typeof gameDate !== 'string') {
    return { valid: false, error: 'Game date must be a string' };
  }

  // Try to parse the date
  const parsed = new Date(gameDate);

  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  return { valid: true, sanitized: parsed };
}

/**
 * Validate game time values (multi-sport support)
 *
 * Validation rules vary by sport:
 * - Basketball: 4 quarters, 12 min max (clock counts DOWN)
 * - Football: 4 quarters, 15 min max (clock counts DOWN)
 * - Hockey: 3 periods, 20 min max (clock counts DOWN)
 * - Soccer: 2 halves, 59 min max for stoppage time (clock counts UP)
 *
 * @param {number} period - Period number (1-based)
 * @param {number} minutes - Minutes on clock
 * @param {number} seconds - Seconds on clock
 * @param {string} sportType - Sport identifier (default: 'basketball')
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateGameTime(period, minutes, seconds, sportType = DEFAULT_SPORT) {
  const config = getSportConfig(sportType);

  // Ensure all values are numbers
  const p = parseInt(period, 10);
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);

  if (isNaN(p) || isNaN(m) || isNaN(s)) {
    return { valid: false, error: 'Game time values must be numbers' };
  }

  // Validate period based on sport
  if (p < 1 || p > config.periods) {
    return {
      valid: false,
      error: `${config.periodLabel} must be 1-${config.periods}`,
    };
  }

  // Validate seconds (same for all sports)
  if (s < 0 || s > 59) {
    return { valid: false, error: 'Seconds must be 0-59' };
  }

  // Validate minutes based on sport and clock direction
  if (config.clockDirection === 'down') {
    // COUNTDOWN sports: max minutes is the period duration
    if (m < 0 || m > config.periodDurationMinutes) {
      return {
        valid: false,
        error: `Minutes must be 0-${config.periodDurationMinutes}`,
      };
    }
    // Full duration only valid with 0 seconds (period start)
    if (m === config.periodDurationMinutes && s > 0) {
      return {
        valid: false,
        error: `Time cannot exceed ${config.periodDurationMinutes}:00`,
      };
    }
  } else {
    // COUNTUP sports (soccer): allow up to maxMinutes for stoppage time
    if (m < 0 || m > config.maxMinutes) {
      return {
        valid: false,
        error: `Minutes must be 0-${config.maxMinutes}`,
      };
    }
  }

  return { valid: true };
}

module.exports = {
  validateNickname,
  validateMessage,
  validateRoomId,
  validateGameTime,
  validateSportType,
  validateRoomName,
  validateTeams,
  validateGameDate,
};
