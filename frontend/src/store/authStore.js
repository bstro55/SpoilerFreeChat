/**
 * Auth Store
 *
 * Manages authentication state using Zustand.
 * Handles Supabase Auth sessions and user preferences from our backend.
 *
 * Key concepts:
 * - session: The Supabase Auth session (contains access token, user info)
 * - profile: User preferences from OUR backend (nickname, theme, etc.)
 * - isLoading: True while we're checking if user is already logged in
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// API base URL for our backend
const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const useAuthStore = create((set, get) => ({
  // Supabase session (contains access_token, user email, etc.)
  session: null,

  // User profile from our backend (preferences, recent rooms)
  profile: null,

  // Loading state for initial auth check
  isLoading: true,

  // Error state
  error: null,

  /**
   * Initialize auth state on app mount
   * Checks if user is already logged in and sets up auth listener
   */
  initialize: async () => {
    try {
      // Check for existing session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({ session, isLoading: false });

      // Set up listener for auth state changes (sign in, sign out, token refresh)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        set({ session });

        if (session) {
          // User signed in - fetch their profile
          get().fetchProfile();
        } else {
          // User signed out - clear profile
          set({ profile: null });
        }
      });

      // Fetch profile if already logged in
      if (session) {
        get().fetchProfile();
      }

      // Return cleanup function
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  /**
   * Fetch user profile (preferences) from our backend
   */
  fetchProfile: async () => {
    const session = get().session;
    if (!session?.access_token) return;

    try {
      const response = await fetch(`${API_URL}/api/user/preferences`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const profile = await response.json();
        set({ profile });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  /**
   * Update user preferences
   */
  updatePreferences: async (preferences) => {
    const session = get().session;
    if (!session?.access_token) return;

    try {
      const response = await fetch(`${API_URL}/api/user/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        set({ profile: updatedProfile });
        return updatedProfile;
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  },

  /**
   * Get recent rooms for quick rejoin
   */
  fetchRecentRooms: async () => {
    const session = get().session;
    if (!session?.access_token) return [];

    try {
      const response = await fetch(`${API_URL}/api/user/recent-rooms`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching recent rooms:', error);
      return [];
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null, profile: null });
    } catch (error) {
      console.error('Error signing out:', error);
      set({ error: error.message });
    }
  },

  /**
   * Helper: Check if user is authenticated
   */
  isAuthenticated: () => !!get().session,

  /**
   * Helper: Get access token for API calls and socket auth
   */
  getAccessToken: () => get().session?.access_token ?? null,

  /**
   * Helper: Get user email
   */
  getUserEmail: () => get().session?.user?.email ?? null,

  /**
   * Clear any errors
   */
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
