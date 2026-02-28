import posthog from 'posthog-js';

/**
 * PostHog Analytics
 *
 * Initializes PostHog for product analytics. Only runs when VITE_POSTHOG_KEY
 * is set, so analytics is silently skipped in local dev if the key is absent.
 *
 * Usage:
 *   import { trackEvent } from '@/lib/posthog';
 *   trackEvent('room_created', { sportType: 'basketball' });
 */
const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

if (key) {
  posthog.init(key, {
    api_host: host,
    // Only create person profiles for identified (signed-in) users
    person_profiles: 'identified_only',
    // Automatically captures pageviews (powers Web Analytics dashboard)
    capture_pageview: true,
  });
}

/**
 * Fire a named analytics event with optional properties.
 * Silently does nothing if PostHog is not configured.
 *
 * @param {string} event - Event name (e.g. 'room_created')
 * @param {Object} [properties] - Additional data to attach to the event
 */
export function trackEvent(event, properties = {}) {
  if (key) {
    posthog.capture(event, properties);
  }
}

/**
 * Associate future events with a known user identity.
 * Call this after a user signs in.
 *
 * @param {string} userId - Unique user ID (e.g. Supabase user UUID)
 * @param {Object} [properties] - User traits (e.g. email)
 */
export function identifyUser(userId, properties = {}) {
  if (key) {
    posthog.identify(userId, properties);
  }
}

/**
 * Reset the PostHog identity. Call this when a user signs out.
 */
export function resetUser() {
  if (key) {
    posthog.reset();
  }
}

export default posthog;
