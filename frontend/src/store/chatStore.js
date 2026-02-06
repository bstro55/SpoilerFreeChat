import { create } from 'zustand';

// Check if there's a stored session on initial load (before React renders)
const SESSION_STORAGE_KEY = 'spoilerfree_session';

/**
 * Check if we should show the "Reconnecting..." screen
 * Returns true only if there's a stored session AND user wasn't viewing home
 */
function shouldShowReconnecting() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      // Only show reconnecting if we have a session AND user wasn't on home screen
      return !!(session && session.sessionId && !session.viewingHome);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Update just the viewingHome flag in stored session
 */
function updateStoredViewingHome(viewingHome) {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      session.viewingHome = viewingHome;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch (e) {
    console.error('Error updating viewingHome in localStorage:', e);
  }
}

/**
 * Chat Store
 *
 * Centralized state management for the chat application.
 * Uses Zustand for simple, hook-based state management.
 *
 * State:
 * - isConnected: Whether the socket is connected to the server
 * - roomId: Current room the user is in (null if not joined)
 * - nickname: User's display name (null if not joined)
 * - sessionId: Database session ID for reconnection support
 * - users: Array of users in the current room
 * - messages: Array of messages in the current room
 * - error: Current error message (null if no error)
 *
 * Sport State (Phase 8):
 * - sportType: The sport type for the current room (e.g., 'basketball', 'soccer')
 * - sportConfig: Sport-specific configuration from server
 *
 * Game Time Sync State (Phase 2, updated Phase 8):
 * - gameTime: { period, minutes, seconds } - User's current game time
 * - isSynced: Whether the user has synced their game time
 * - offset: Delay in milliseconds relative to baseline
 * - offsetFormatted: Human-readable offset (e.g., "23 seconds behind")
 * - isBaseline: Whether this user set the room's baseline
 * - lastSyncTime: Timestamp of last sync (for resync reminder)
 */
const useChatStore = create((set) => ({
  // Connection state
  isConnected: false,
  isReconnecting: false,
  connectionError: null,
  pendingAutoReconnect: shouldShowReconnecting(), // True only if stored session AND not viewing home
  setConnected: (connected) => set({
    isConnected: connected,
    isReconnecting: false,
    connectionError: connected ? null : undefined // Clear error on connect, keep on disconnect
  }),
  setReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),
  setConnectionError: (error) => set({ connectionError: error }),
  setPendingAutoReconnect: (pending) => set({ pendingAutoReconnect: pending }),

  // Room state
  roomId: null,
  nickname: null,
  sessionId: null,  // Database session ID for reconnection
  sportType: null,  // Sport type for the room (Phase 8)
  sportConfig: null, // Sport-specific config from server (Phase 8)
  // Room metadata (Phase 11)
  roomName: null,  // Display name for the room
  teams: null,     // Teams playing (e.g., "Lakers vs Celtics")
  gameDate: null,  // Date of the game
  setRoom: (roomId, nickname, sessionId = null, sportType = null, sportConfig = null, roomMetadata = null) =>
    set({
      roomId,
      nickname,
      sessionId,
      sportType,
      sportConfig,
      roomName: roomMetadata?.roomName || null,
      teams: roomMetadata?.teams || null,
      gameDate: roomMetadata?.gameDate || null,
      viewingHome: false
    }),
  clearRoom: () => set({
    roomId: null,
    nickname: null,
    sessionId: null,
    sportType: null,
    sportConfig: null,
    roomName: null,
    teams: null,
    gameDate: null,
    users: [],
    messages: [],
    // Reset sync state when leaving room
    gameTime: null,
    isSynced: false,
    offset: 0,
    offsetFormatted: 'Not synced',
    isBaseline: false,
    lastSyncTime: null,
    viewingHome: false
  }),

  // Navigation state (Phase 10)
  // When true, shows JoinRoom view even while connected to a room
  // This allows users to go "home" without leaving their room
  viewingHome: false,
  setViewingHome: (viewing) => {
    // Persist to localStorage so it survives page refresh
    updateStoredViewingHome(viewing);
    set({ viewingHome: viewing });
  },

  // Users in the room
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({
    users: [...state.users, user]
  })),
  removeUser: (userId) => set((state) => ({
    users: state.users.filter((u) => u.id !== userId)
  })),
  // Update a specific user's sync status (when they sync their game time)
  updateUserSync: (userId, syncData) => set((state) => ({
    users: state.users.map((u) =>
      u.id === userId
        ? { ...u, ...syncData }
        : u
    )
  })),

  // Messages
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  // Error handling
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Game Time Sync State (Phase 2, updated Phase 8 for multi-sport)
  gameTime: null, // { period, minutes, seconds } - 'period' is generic for quarter/period/half
  isSynced: false,
  offset: 0, // milliseconds
  offsetFormatted: 'Not synced',
  isBaseline: false,
  lastSyncTime: null, // Timestamp for resync reminder

  // Set the user's synced game time and offset
  setSyncState: ({ gameTime, offset, offsetFormatted, isBaseline }) => set({
    gameTime,
    isSynced: true,
    offset,
    offsetFormatted,
    isBaseline,
    lastSyncTime: Date.now()
  })
}));

export default useChatStore;
