/**
 * Sport Configuration (Frontend)
 *
 * This mirrors the backend sport configuration for UI rendering.
 * Defines the timing rules and display settings for each supported sport.
 *
 * Used by:
 * - JoinRoom.jsx: Sport selector UI
 * - TimeSync.jsx: Dynamic period labels and validation
 * - ChatRoom.jsx: Sport display in room header
 */

export const SPORT_CONFIGS = {
  basketball: {
    id: 'basketball',
    label: 'Basketball',
    emoji: '🏀',
    periods: 4,
    periodLabel: 'Quarter',
    periodLabelShort: 'Q',
    periodDurationMinutes: 12,
    clockDirection: 'down', // Clock counts DOWN
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
    clockDirection: 'up', // Clock counts UP
    maxMinutes: 59, // Allow stoppage time
    description: '2 halves, 45+ min each',
  },
};

export const DEFAULT_SPORT = 'basketball';

/**
 * Get configuration for a specific sport type.
 * Falls back to basketball if sport type is invalid.
 *
 * @param {string} sportType - Sport identifier
 * @returns {Object} Sport configuration object
 */
export function getSportConfig(sportType) {
  return SPORT_CONFIGS[sportType] || SPORT_CONFIGS[DEFAULT_SPORT];
}

/**
 * Get all available sports as an array.
 * Useful for populating sport selector UI.
 *
 * @returns {Array} Array of sport configuration objects
 */
export function getAllSports() {
  return Object.values(SPORT_CONFIGS);
}

/**
 * Format game time for display based on sport.
 *
 * @param {Object} gameTime - { period, minutes, seconds }
 * @param {string} sportType - Sport identifier
 * @returns {string} Formatted game time string
 */
export function formatGameTime(gameTime, sportType = DEFAULT_SPORT) {
  if (!gameTime) return null;

  const config = getSportConfig(sportType);
  const { period, minutes, seconds } = gameTime;
  const paddedSeconds = seconds.toString().padStart(2, '0');

  if (config.periodLabel === 'Half') {
    // Soccer: "1st Half 23:15"
    const ordinal = period === 1 ? '1st' : '2nd';
    return `${ordinal} Half ${minutes}:${paddedSeconds}`;
  }

  // Other sports: "Q3 8:42" or "P2 15:30"
  return `${config.periodLabelShort}${period} ${minutes}:${paddedSeconds}`;
}

/**
 * Get period options for the period selector dropdown.
 *
 * @param {string} sportType - Sport identifier
 * @returns {Array} Array of { value, label } objects
 */
export function getPeriodOptions(sportType = DEFAULT_SPORT) {
  const config = getSportConfig(sportType);
  const options = [];

  for (let i = 1; i <= config.periods; i++) {
    let label;
    if (config.periodLabel === 'Half') {
      label = i === 1 ? '1st Half' : '2nd Half';
    } else {
      label = `${config.periodLabelShort}${i}`;
    }
    options.push({ value: String(i), label });
  }

  return options;
}
