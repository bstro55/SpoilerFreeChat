import { create } from 'zustand';

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
 * Game Time Sync State (Phase 2):
 * - gameTime: { quarter, minutes, seconds } - User's current game time
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
  setConnected: (connected) => set({
    isConnected: connected,
    isReconnecting: false,
    connectionError: connected ? null : undefined // Clear error on connect, keep on disconnect
  }),
  setReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),
  setConnectionError: (error) => set({ connectionError: error }),

  // Room state
  roomId: null,
  nickname: null,
  sessionId: null,  // Database session ID for reconnection
  setRoom: (roomId, nickname, sessionId = null) => set({ roomId, nickname, sessionId }),
  clearRoom: () => set({
    roomId: null,
    nickname: null,
    sessionId: null,
    users: [],
    messages: [],
    // Reset sync state when leaving room
    gameTime: null,
    isSynced: false,
    offset: 0,
    offsetFormatted: 'Not synced',
    isBaseline: false,
    lastSyncTime: null
  }),

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

  // Game Time Sync State (Phase 2)
  gameTime: null, // { quarter, minutes, seconds }
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
