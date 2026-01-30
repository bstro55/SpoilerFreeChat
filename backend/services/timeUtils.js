/**
 * Time Utilities for SpoilerFreeChat
 *
 * This module handles all game time calculations and offset logic.
 *
 * KEY CONCEPTS:
 *
 * 1. Game Time: The clock shown during the broadcast (e.g., "8:42 left in Q3")
 *
 * 2. Elapsed Seconds: How many seconds of game time have passed since the game started.
 *    Basketball example: If we're at 8:42 left in Q3:
 *    - Q1 complete: 12:00 = 720 seconds
 *    - Q2 complete: 12:00 = 720 seconds
 *    - Q3 so far: 12:00 - 8:42 = 3:18 = 198 seconds
 *    - Total elapsed: 720 + 720 + 198 = 1638 seconds
 *
 * 3. Reference Point: When the game "started" in real-world time for this user.
 *    Calculated as: currentRealTime - elapsedGameSeconds
 *
 *    If User A is at 8:42 Q3 at real time 10:00:00 AM:
 *    Reference = 10:00:00 - 1638 seconds = 9:32:42 AM
 *
 * 4. Canonical Baseline: The first user to sync sets the room's baseline.
 *    All other users' offsets are calculated relative to this.
 *
 * 5. Offset: How many seconds behind the baseline a user is.
 *    - Positive offset = user is behind (they see plays later)
 *    - Zero offset = user is at the baseline (most "live")
 */

// Basketball: 4 quarters, 12 minutes each
const QUARTER_DURATION_SECONDS = 12 * 60; // 720 seconds
const TOTAL_QUARTERS = 4;

/**
 * Converts a game clock time to total elapsed seconds from game start.
 *
 * In basketball, the clock counts DOWN from 12:00 to 0:00 each quarter.
 * So "8:42 left in Q3" means 3 minutes 18 seconds have passed in Q3.
 *
 * @param {number} quarter - The current quarter (1-4)
 * @param {number} minutes - Minutes remaining on the clock (0-12)
 * @param {number} seconds - Seconds remaining on the clock (0-59)
 * @returns {number} Total elapsed seconds since game start
 *
 * @example
 * // 8:42 left in Q3
 * gameTimeToElapsedSeconds(3, 8, 42)
 * // Returns: 720 + 720 + 198 = 1638 seconds
 */
function gameTimeToElapsedSeconds(quarter, minutes, seconds) {
  // Validate inputs
  if (quarter < 1 || quarter > TOTAL_QUARTERS) {
    throw new Error(`Invalid quarter: ${quarter}. Must be 1-${TOTAL_QUARTERS}`);
  }
  if (minutes < 0 || minutes > 12) {
    throw new Error(`Invalid minutes: ${minutes}. Must be 0-12`);
  }
  if (seconds < 0 || seconds > 59) {
    throw new Error(`Invalid seconds: ${seconds}. Must be 0-59`);
  }

  // Calculate seconds elapsed in completed quarters
  const completedQuarters = quarter - 1;
  const completedQuarterSeconds = completedQuarters * QUARTER_DURATION_SECONDS;

  // Calculate seconds elapsed in current quarter
  // Clock shows time REMAINING, so we subtract from quarter duration
  const timeRemainingInQuarter = (minutes * 60) + seconds;
  const elapsedInCurrentQuarter = QUARTER_DURATION_SECONDS - timeRemainingInQuarter;

  return completedQuarterSeconds + elapsedInCurrentQuarter;
}

/**
 * Converts elapsed seconds back to game time display format.
 * Useful for debugging and displaying to users.
 *
 * @param {number} elapsedSeconds - Total seconds since game start
 * @returns {object} { quarter, minutes, seconds, display }
 *
 * @example
 * elapsedSecondsToGameTime(1638)
 * // Returns: { quarter: 3, minutes: 8, seconds: 42, display: "Q3 8:42" }
 */
function elapsedSecondsToGameTime(elapsedSeconds) {
  // Clamp to valid range
  const maxElapsed = TOTAL_QUARTERS * QUARTER_DURATION_SECONDS;
  elapsedSeconds = Math.max(0, Math.min(elapsedSeconds, maxElapsed));

  // Determine which quarter we're in
  const quarter = Math.min(
    Math.floor(elapsedSeconds / QUARTER_DURATION_SECONDS) + 1,
    TOTAL_QUARTERS
  );

  // Calculate how much time has elapsed in this quarter
  const completedQuarterSeconds = (quarter - 1) * QUARTER_DURATION_SECONDS;
  const elapsedInQuarter = elapsedSeconds - completedQuarterSeconds;

  // Convert to time remaining (clock counts down)
  const timeRemaining = QUARTER_DURATION_SECONDS - elapsedInQuarter;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // Format display string
  const display = `Q${quarter} ${minutes}:${seconds.toString().padStart(2, '0')}`;

  return { quarter, minutes, seconds, display };
}

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
  return realTimeMs - (elapsedGameSeconds * 1000);
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

/**
 * Validates game time input values.
 *
 * @param {number} quarter - Quarter number (1-4)
 * @param {number} minutes - Minutes (0-12)
 * @param {number} seconds - Seconds (0-59)
 * @returns {object} { valid: boolean, error?: string }
 */
function validateGameTime(quarter, minutes, seconds) {
  if (typeof quarter !== 'number' || quarter < 1 || quarter > TOTAL_QUARTERS) {
    return { valid: false, error: `Quarter must be 1-${TOTAL_QUARTERS}` };
  }
  if (typeof minutes !== 'number' || minutes < 0 || minutes > 12) {
    return { valid: false, error: 'Minutes must be 0-12' };
  }
  if (typeof seconds !== 'number' || seconds < 0 || seconds > 59) {
    return { valid: false, error: 'Seconds must be 0-59' };
  }
  // Special case: 12:00 is only valid at quarter start
  if (minutes === 12 && seconds > 0) {
    return { valid: false, error: 'Minutes cannot exceed 12:00' };
  }
  return { valid: true };
}

module.exports = {
  QUARTER_DURATION_SECONDS,
  TOTAL_QUARTERS,
  gameTimeToElapsedSeconds,
  elapsedSecondsToGameTime,
  calculateReferencePoint,
  calculateOffset,
  formatOffset,
  validateGameTime
};
