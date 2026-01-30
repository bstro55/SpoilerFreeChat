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
 * - users: Array of users in the current room
 * - messages: Array of messages in the current room
 * - error: Current error message (null if no error)
 */
const useChatStore = create((set) => ({
  // Connection state
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // Room state
  roomId: null,
  nickname: null,
  setRoom: (roomId, nickname) => set({ roomId, nickname }),
  clearRoom: () => set({ roomId: null, nickname: null, users: [], messages: [] }),

  // Users in the room
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({
    users: [...state.users, user]
  })),
  removeUser: (userId) => set((state) => ({
    users: state.users.filter((u) => u.id !== userId)
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
  clearError: () => set({ error: null })
}));

export default useChatStore;
