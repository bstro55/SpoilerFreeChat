/**
 * Supabase Client
 *
 * This creates a single shared Supabase client instance for the entire app.
 * Used for authentication (sign in, sign out, session management).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create and export the Supabase client
// Returns null if environment variables are missing (auth becomes unavailable)
// This allows the app to work in guest-only mode without Supabase configured
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!supabase) {
  console.warn(
    'Supabase not configured. Authentication features disabled. To enable, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}
