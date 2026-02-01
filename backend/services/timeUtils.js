/**
 * Time Utilities for SpoilerFreeChat (Multi-Sport Support)
 *
 * This module handles all game time calculations and offset logic.
 * Updated in Phase 8 to support multiple sports with different timing rules.
 *
 * KEY CONCEPTS:
 *
 * 1. Game Time: The clock shown during the broadcast (e.g., "8:42 left in Q3")
 *
 * 2. Elapsed Seconds: How many seconds of game time have passed since the game started.
 *    This is the common unit that works across all sports.
 *
 * 3. Clock Direction: Different sports have different clock behavior:
 *    - COUNTDOWN (basketball, football, hockey): Clock shows time REMAINING
 *    - COUNTUP (soccer): Clock shows time ELAPSED
 *
 * 4. Reference Point: When the game "started" in real-world time for this user.
 *    Calculated as: currentRealTime - elapsedGameSeconds
 *
 * 5. Offset: How many seconds behind the baseline a user is.
 *    This is SPORT-AGNOSTIC - once we have elapsed seconds, offset math is the same.
 */

const { getSportConfig, DEFAULT_SPORT } = require('./sportConfig');

/**
 * Converts a game clock time to total elapsed seconds from game start.
 *
 * For COUNTDOWN sports (basketball, football, hockey):
 *   Clock shows time REMAINING, so elapsed = duration - remaining
 *   Example: "8:42 left in Q3" = 3:18 elapsed in Q3
 *
 * For COUNTUP sports (soccer):
 *   Clock shows time ELAPSED directly
 *   Example: "23:15 in 1st Half" = 23:15 elapsed in that half
 *
 * @param {number} period - The current period (1-based: Q1, P1, 1st Half, etc.)
 * @param {number} minutes - Minutes on the clock
 * @param {number} seconds - Seconds on the clock (0-59)
 * @param {string} sportType - Sport identifier (default: 'basketball')
 * @returns {number} Total elapsed seconds since game start
 *
 * @example
 * // Basketball: 8:42 left in Q3
 * gameTimeToElapsedSeconds(3, 8, 42, 'basketball')
 * // Returns: 720 + 720 + 198 = 1638 seconds
 *
 * @example
 * // Soccer: 23:15 into 1st Half
 * gameTimeToElapsedSeconds(1, 23, 15, 'soccer')
 * // Returns: 23*60 + 15 = 1395 seconds
 */
function gameTimeToElapsedSeconds(period, minutes, seconds, sportType = DEFAULT_SPORT) {
  const config = getSportConfig(sportType);
  const periodDurationSeconds = config.periodDurationMinutes * 60;

  // Validate period
  if (period < 1 || period > config.periods) {
    throw new Error(
      `Invalid ${config.periodLabel.toLowerCase()}: ${period}. Must be 1-${config.periods}`
    );
  }

  // Calculate seconds elapsed in completed periods
  const completedPeriods = period - 1;
  const completedPeriodSeconds = completedPeriods * periodDurationSeconds;

  // Calculate seconds elapsed in current period based on clock direction
  let elapsedInCurrentPeriod;

  if (config.clockDirection === 'down') {
    // COUNTDOWN: clock shows time REMAINING
    // So elapsed = duration - remaining
    const timeRemainingInPeriod = minutes * 60 + seconds;
    elapsedInCurrentPeriod = periodDurationSeconds - timeRemainingInPeriod;
  } else {
    // COUNTUP: clock shows time ELAPSED directly
    elapsedInCurrentPeriod = minutes * 60 + seconds;
  }

  return completedPeriodSeconds + elapsedInCurrentPeriod;
}

/**
 * Converts elapsed seconds back to game time display format.
 * Useful for debugging and displaying to users.
 *
 * @param {number} elapsedSeconds - Total seconds since game start
 * @param {string} sportType - Sport identifier (default: 'basketball')
 * @returns {object} { period, minutes, seconds, display }
 *
 * @example
 * // Basketball
 * elapsedSecondsToGameTime(1638, 'basketball')
 * // Returns: { period: 3, minutes: 8, seconds: 42, display: "Q3 8:42" }
 *
 * @example
 * // Soccer
 * elapsedSecondsToGameTime(1395, 'soccer')
 * // Returns: { period: 1, minutes: 23, seconds: 15, display: "1st Half 23:15" }
 */
function elapsedSecondsToGameTime(elapsedSeconds, sportType = DEFAULT_SPORT) {
  const config = getSportConfig(sportType);
  const periodDurationSeconds = config.periodDurationMinutes * 60;

  // Clamp to valid range
  const maxElapsed = config.periods * periodDurationSeconds;
  elapsedSeconds = Math.max(0, Math.min(elapsedSeconds, maxElapsed));

  // Determine which period we're in
  const period = Math.min(
    Math.floor(elapsedSeconds / periodDurationSeconds) + 1,
    config.periods
  );

  // Calculate how much time has elapsed in this period
  const completedPeriodSeconds = (period - 1) * periodDurationSeconds;
  const elapsedInPeriod = elapsedSeconds - completedPeriodSeconds;

  let minutes, seconds, display;

  if (config.clockDirection === 'down') {
    // COUNTDOWN: show time remaining
    const timeRemaining = periodDurationSeconds - elapsedInPeriod;
    minutes = Math.floor(timeRemaining / 60);
    seconds = timeRemaining % 60;
    display = `${config.periodLabelShort}${period} ${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    // COUNTUP: show time elapsed
    minutes = Math.floor(elapsedInPeriod / 60);
    seconds = elapsedInPeriod % 60;
    // For soccer: "1st Half 23:15" or "2nd Half 23:15"
    const ordinal = period === 1 ? '1st' : '2nd';
    display = `${ordinal} ${config.periodLabel} ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return { period, minutes, seconds, display };
}

/**
 * Validates game time input values for a specific sport.
 *
 * @param {number} period - Period number (1-based)
 * @param {number} minutes - Minutes on clock
 * @param {number} seconds - Seconds on clock
 * @param {string} sportType - Sport identifier (default: 'basketball')
 * @returns {object} { valid: boolean, error?: string }
 */
function validateGameTime(period, minutes, seconds, sportType = DEFAULT_SPORT) {
  const config = getSportConfig(sportType);

  if (typeof period !== 'number' || period < 1 || period > config.periods) {
    return {
      valid: false,
      error: `${config.periodLabel} must be 1-${config.periods}`,
    };
  }

  if (typeof minutes !== 'number' || minutes < 0) {
    return { valid: false, error: 'Minutes must be 0 or greater' };
  }

  if (typeof seconds !== 'number' || seconds < 0 || seconds > 59) {
    return { valid: false, error: 'Seconds must be 0-59' };
  }

  // Sport-specific minute validation based on clock direction
  if (config.clockDirection === 'down') {
    // COUNTDOWN sports: max minutes is the period duration
    if (minutes > config.periodDurationMinutes) {
      return {
        valid: false,
        error: `Minutes must be 0-${config.periodDurationMinutes}`,
      };
    }
    // Special case: full duration only valid with 0 seconds
    if (minutes === config.periodDurationMinutes && seconds > 0) {
      return {
        valid: false,
        error: `Time cannot exceed ${config.periodDurationMinutes}:00`,
      };
    }
  } else {
    // COUNTUP sports (soccer): allow up to maxMinutes for stoppage time
    if (minutes > config.maxMinutes) {
      return {
        valid: false,
        error: `Minutes must be 0-${config.maxMinutes}`,
      };
    }
  }

  return { valid: true };
}

// ============================================
// SPORT-AGNOSTIC FUNCTIONS (unchanged from Phase 7)
// These work with elapsed seconds, so they don't need sport knowledge
// ============================================

/**
 * Calculates a user's reference point (when the game "started" for them).
 *
 * The reference point is when the game would have started in real-world time
 * given the user's current position in the game.
 *
 * @param {number} realTimeMs - Current real-world time in milliseconds (Date.now())
 * @param {number} elapsedGameSeconds - How many seconds of game have elapsed
 * @returns {number} Reference point in milliseconds
 *
 * @example
 * // User is at 1638 seconds into the game at real time 1000000000000
 * calculateReferencePoint(1000000000000, 1638)
 * // Returns: 1000000000000 - (1638 * 1000) = 998362000000
 */
function calculateReferencePoint(realTimeMs, elapsedGameSeconds) {
  return realTimeMs - elapsedGameSeconds * 1000;
}

/**
 * Calculates a user's offset relative to the room's canonical baseline.
 *
 * The offset tells us how many seconds behind the baseline this user is.
 * A positive offset means messages should be delayed for this user.
 *
 * @param {number} userReferenceMs - User's reference point in milliseconds
 * @param {number} canonicalBaselineMs - Room's baseline reference in milliseconds
 * @returns {number} Offset in milliseconds (always >= 0)
 *
 * @example
 * // User A (baseline) reference: 998362000000
 * // User B reference: 998392000000 (game started 30 seconds later for them)
 * calculateOffset(998392000000, 998362000000)
 * // Returns: 30000 (User B is 30 seconds behind)
 */
function calculateOffset(userReferenceMs, canonicalBaselineMs) {
  // If user's reference is LATER than baseline, they're behind
  // (their game "started" later, so they're seeing content later)
  const offset = userReferenceMs - canonicalBaselineMs;

  // Never return negative offset - if user is "ahead" of baseline,
  // they just get messages immediately (offset = 0)
  return Math.max(0, offset);
}

/**
 * Formats an offset in milliseconds to a human-readable string.
 *
 * @param {number} offsetMs - Offset in milliseconds
 * @returns {string} Human-readable string like "23 seconds behind" or "Live"
 */
function formatOffset(offsetMs) {
  if (offsetMs === 0) {
    return 'Live (no delay)';
  }

  const totalSeconds = Math.round(offsetMs / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'} behind`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} behind`;
  }

  return `${minutes}m ${seconds}s behind`;
}

module.exports = {
  gameTimeToElapsedSeconds,
  elapsedSecondsToGameTime,
  calculateReferencePoint,
  calculateOffset,
  formatOffset,
  validateGameTime,
};
