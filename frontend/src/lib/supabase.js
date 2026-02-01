/**
 * Supabase Client
 *
 * This creates a single shared Supabase client instance for the entire app.
 * Used for authentication (sign in, sign out, session management).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// Create and export the Supabase client
// This is the main entry point for all Supabase operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
