import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';

/**
 * Socket.IO Connection Hook
 *
 * Manages the WebSocket connection to the server and handles all socket events.
 * This hook is designed to be used once at the app level.
 *
 * Session Persistence (Phase 6):
 * - Stores session info in localStorage for reconnection support
 * - Sends sessionId when rejoining to restore game time sync state
 *
 * Returns:
 * - socket: The Socket.IO socket instance
 * - joinRoom: Function to join a room
 * - sendMessage: Function to send a message
 * - leaveRoom: Function to leave the current room
 * - syncGameTime: Function to sync the user's game time
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// LocalStorage key for session data
const SESSION_STORAGE_KEY = 'spoilerfree_session';

/**
 * Get stored session from localStorage
 * @returns {Object|null} { roomId, nickname, sessionId } or null
 */
function getStoredSession() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error('Error reading session from localStorage:', e);
    return null;
  }
}

/**
 * Store session in localStorage for reconnection
 * @param {string} roomId
 * @param {string} nickname
 * @param {string} sessionId
 */
function storeSession(roomId, nickname, sessionId) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      roomId,
      nickname,
      sessionId
    }));
  } catch (e) {
    console.error('Error storing session in localStorage:', e);
  }
}

/**
 * Clear stored session from localStorage
 */
function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing session from localStorage:', e);
  }
}

export function useSocket() {
  const socketRef = useRef(null);

  // Get store actions
  const {
    setConnected,
    setReconnecting,
    setConnectionError,
    setRoom,
    clearRoom,
    setUsers,
    addUser,
    removeUser,
    setMessages,
    addMessage,
    setError,
    // Phase 2: Game time sync actions
    setSyncState,
    updateUserSync
  } = useChatStore();

  // Initialize socket connection
  useEffect(() => {
    // Get auth token if user is logged in (optional - guests won't have one)
    const token = useAuthStore.getState().getAccessToken();

    // Create socket connection with optional auth token
    socketRef.current = io(SOCKET_URL, {
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Pass auth token if available (for authenticated users)
      auth: {
        token: token
      }
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setConnected(false);
      // Set a friendly message based on the disconnect reason
      if (reason === 'io server disconnect') {
        setConnectionError('Disconnected by server');
      } else if (reason === 'transport close') {
        setConnectionError('Connection lost');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionError('Unable to connect to server');
    });

    // Reconnection events
    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}...`);
      setReconnecting(true);
    });

    socket.io.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      setReconnecting(false);
      setConnectionError(null);
    });

    socket.io.on('reconnect_failed', () => {
      console.error('Failed to reconnect');
      setReconnecting(false);
      setConnectionError('Failed to reconnect. Please refresh the page.');
    });

    // Room events
    socket.on('joined-room', (data) => {
      console.log('Joined room:', data);

      // Store session in localStorage for future reconnection
      if (data.sessionId) {
        storeSession(data.roomId, data.nickname, data.sessionId);
      }

      // Update store with room info (including sessionId)
      setRoom(data.roomId, data.nickname, data.sessionId);
      setUsers(data.users);
      setMessages(data.messages || []);

      // If reconnecting with restored sync state, apply it
      if (data.isReconnect && data.syncState) {
        console.log('Restoring sync state from server:', data.syncState);
        setSyncState({
          gameTime: {
            quarter: data.syncState.quarter,
            minutes: data.syncState.minutes,
            seconds: data.syncState.seconds
          },
          offset: data.syncState.offset,
          offsetFormatted: data.syncState.offsetFormatted,
          isBaseline: data.syncState.isBaseline
        });
      }

      if (data.isReconnect) {
        console.log('Successfully reconnected to room with previous session');
      }
    });

    socket.on('user-joined', (user) => {
      console.log('User joined:', user);
      addUser(user);
    });

    socket.on('user-left', (user) => {
      console.log('User left:', user);
      removeUser(user.id);
    });

    // Message events
    socket.on('new-message', (message) => {
      addMessage(message);
    });

    // Phase 2: Game time sync events
    socket.on('sync-confirmed', (data) => {
      console.log('Game time sync confirmed:', data);
      setSyncState({
        gameTime: { quarter: data.quarter, minutes: data.minutes, seconds: data.seconds },
        offset: data.offset,
        offsetFormatted: data.offsetFormatted,
        isBaseline: data.isBaseline
      });
    });

    socket.on('user-synced', (data) => {
      console.log('User synced their game time:', data);
      updateUserSync(data.id, {
        isSynced: data.isSynced,
        offset: data.offset,
        offsetFormatted: data.offsetFormatted
      });
    });

    // When our offset changes due to someone else syncing (baseline shift)
    socket.on('offset-updated', (data) => {
      console.log('Our offset was updated (baseline shift):', data);
      setSyncState({
        gameTime: useChatStore.getState().gameTime, // Keep existing game time
        offset: data.offset,
        offsetFormatted: data.offsetFormatted,
        isBaseline: data.isBaseline
      });
    });

    // Session expired event
    socket.on('session-expired', (data) => {
      console.log('Session expired:', data.message);
      clearStoredSession();
      setError(data.message);
    });

    // Error events
    socket.on('error', (data) => {
      console.error('Server error:', data);
      setError(data.message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [setConnected, setReconnecting, setConnectionError, setRoom, clearRoom, setUsers, addUser, removeUser, setMessages, addMessage, setError, setSyncState, updateUserSync]);

  // Join a room (with session support for reconnection)
  const joinRoom = useCallback((roomId, nickname) => {
    if (socketRef.current) {
      // Check if we have a stored session for this room/nickname combo
      const storedSession = getStoredSession();
      let sessionId = null;

      if (storedSession &&
          storedSession.roomId === roomId &&
          storedSession.nickname === nickname) {
        sessionId = storedSession.sessionId;
        console.log('Found stored session, attempting reconnection...');
      }

      socketRef.current.emit('join-room', { roomId, nickname, sessionId });
    }
  }, []);

  // Send a message
  const sendMessage = useCallback((content) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', { content });
    }
  }, []);

  // Leave the current room (disconnect and reconnect)
  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      // Clear stored session when explicitly leaving
      clearStoredSession();
      socketRef.current.disconnect();
      socketRef.current.connect();
      clearRoom();
    }
  }, [clearRoom]);

  // Phase 2: Sync game time
  const syncGameTime = useCallback((quarter, minutes, seconds) => {
    if (socketRef.current) {
      socketRef.current.emit('sync-game-time', { quarter, minutes, seconds });
    }
  }, []);

  return {
    socket: socketRef.current,
    joinRoom,
    sendMessage,
    leaveRoom,
    syncGameTime
  };
}

export default useSocket;
