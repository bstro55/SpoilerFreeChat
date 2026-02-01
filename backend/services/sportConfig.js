/**
 * Sport Configuration Module
 *
 * This is the single source of truth for all sport-specific settings.
 * Each sport has different:
 * - Number of periods (quarters, halves, periods)
 * - Period duration in minutes
 * - Clock direction (counts down vs counts up)
 * - Display labels and formatting
 *
 * The offset calculation logic (in roomManager.js) is sport-agnostic -
 * it only works with elapsed seconds. This module handles the conversion
 * between display time and elapsed seconds for each sport.
 */

const SPORT_CONFIGS = {
  basketball: {
    id: 'basketball',
    label: 'Basketball',
    emoji: '🏀',
    periods: 4,
    periodLabel: 'Quarter', // Full name: "Quarter 1"
    periodLabelShort: 'Q', // Short name: "Q1"
    periodDurationMinutes: 12,
    clockDirection: 'down', // Clock counts DOWN (12:00 -> 0:00)
    maxMinutes: 12,
    description: '4 quarters, 12 min each',
  },
  football: {
    id: 'football',
    label: 'Football',
    emoji: '🏈',
    periods: 4,
    periodLabel: 'Quarter',
    periodLabelShort: 'Q',
    periodDurationMinutes: 15,
    clockDirection: 'down',
    maxMinutes: 15,
    description: '4 quarters, 15 min each',
  },
  hockey: {
    id: 'hockey',
    label: 'Hockey',
    emoji: '🏒',
    periods: 3,
    periodLabel: 'Period',
    periodLabelShort: 'P',
    periodDurationMinutes: 20,
    clockDirection: 'down',
    maxMinutes: 20,
    description: '3 periods, 20 min each',
  },
  soccer: {
    id: 'soccer',
    label: 'Soccer',
    emoji: '⚽',
    periods: 2,
    periodLabel: 'Half',
    periodLabelShort: 'H',
    periodDurationMinutes: 45,
    clockDirection: 'up', // Clock counts UP (0:00 -> 45:00+)
    maxMinutes: 59, // Allow stoppage time (up to 59:59)
    allowStoppageTime: true,
    description: '2 halves, 45+ min each',
  },
};

// Default sport for backwards compatibility with existing rooms
const DEFAULT_SPORT = 'basketball';

/**
 * Get configuration for a specific sport type.
 * Falls back to basketball if sport type is invalid.
 *
 * @param {string} sportType - Sport identifier (e.g., 'basketball', 'soccer')
 * @returns {Object} Sport configuration object
 */
function getSportConfig(sportType) {
  return SPORT_CONFIGS[sportType] || SPORT_CONFIGS[DEFAULT_SPORT];
}

/**
 * Get all available sports as an array.
 * Useful for populating dropdown menus or sport selectors.
 *
 * @returns {Array} Array of sport configuration objects
 */
function getAllSports() {
  return Object.values(SPORT_CONFIGS);
}

/**
 * Check if a sport type is valid.
 *
 * @param {string} sportType - Sport identifier to check
 * @returns {boolean} True if valid sport type
 */
function isValidSportType(sportType) {
  return sportType in SPORT_CONFIGS;
}

/**
 * Get the list of valid sport type identifiers.
 *
 * @returns {Array<string>} Array of valid sport type strings
 */
function getValidSportTypes() {
  return Object.keys(SPORT_CONFIGS);
}

module.exports = {
  SPORT_CONFIGS,
  DEFAULT_SPORT,
  getSportConfig,
  getAllSports,
  isValidSportType,
  getValidSportTypes,
};
