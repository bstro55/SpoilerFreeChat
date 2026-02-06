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
 * @param {string} sportType - Sport type for the room (Phase 8)
 * @param {boolean} viewingHome - Whether user was viewing home screen (Phase 10)
 */
function storeSession(roomId, nickname, sessionId, sportType = null, viewingHome = false) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      roomId,
      nickname,
      sessionId,
      sportType,
      viewingHome
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

// Timeout for auto-reconnection (10 seconds)
const RECONNECT_TIMEOUT_MS = 10000;

export function useSocket() {
  const socketRef = useRef(null);
  const lastTokenRef = useRef(null); // Track the last token used for connection
  const reconnectTimeoutRef = useRef(null); // Track reconnect timeout

  // Get store actions
  const {
    setConnected,
    setReconnecting,
    setConnectionError,
    setPendingAutoReconnect,
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

  // Subscribe to auth state changes and reconnect socket when token changes
  // This ensures authenticated users get their token sent to the server
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      const newToken = state.session?.access_token;
      const oldToken = prevState.session?.access_token;

      // If token changed (e.g., user signed in or out), reconnect with new token
      if (newToken !== oldToken && socketRef.current) {
        console.log('Auth state changed, reconnecting socket with new token');
        lastTokenRef.current = newToken;
        socketRef.current.auth = { token: newToken };
        socketRef.current.disconnect();
        socketRef.current.connect();
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize socket connection
  useEffect(() => {
    // Get auth token if user is logged in (optional - guests won't have one)
    const token = useAuthStore.getState().getAccessToken();
    lastTokenRef.current = token;

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

      // Auto-reconnect: Check for stored session and rejoin automatically
      const storedSession = getStoredSession();
      if (storedSession && storedSession.sessionId) {
        // If user was viewing home when they refreshed, don't show "Reconnecting..." spinner
        // Just reconnect in background and show home screen
        if (storedSession.viewingHome) {
          console.log('Found stored session with viewingHome=true, reconnecting in background');
          setPendingAutoReconnect(false); // Don't show spinner
        } else {
          console.log('Found stored session, auto-reconnecting to room:', storedSession.roomId);
          setPendingAutoReconnect(true);

          // Set timeout for reconnection - if it takes too long, fall back to JoinRoom
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Auto-reconnect timed out after', RECONNECT_TIMEOUT_MS, 'ms');
            setPendingAutoReconnect(false);
            clearStoredSession();
            setError('Reconnection timed out. Please join the room again.');
          }, RECONNECT_TIMEOUT_MS);
        }
        socket.emit('join-room', {
          roomId: storedSession.roomId,
          nickname: storedSession.nickname,
          sessionId: storedSession.sessionId,
          sportType: storedSession.sportType || 'basketball',
          viewingHome: storedSession.viewingHome || false
        });
      }
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

      // Clear reconnect timeout since we successfully joined
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Check if we need to preserve viewingHome state from stored session
      const storedSession = getStoredSession();
      const shouldViewHome = data.isReconnect && storedSession?.viewingHome;

      // Store session in localStorage for future reconnection (include sportType and viewingHome)
      if (data.sessionId) {
        storeSession(data.roomId, data.nickname, data.sessionId, data.sportType, shouldViewHome);
      }

      // Update store with room info (including sessionId and sport info)
      setRoom(data.roomId, data.nickname, data.sessionId, data.sportType, data.sportConfig, {
        roomName: data.roomName,
        teams: data.teams,
        gameDate: data.gameDate
      });

      // If user was viewing home when they refreshed, keep them on home screen
      if (shouldViewHome) {
        useChatStore.getState().setViewingHome(true);
      }

      setPendingAutoReconnect(false); // Clear pending state now that we've joined
      setUsers(data.users);
      setMessages(data.messages || []);

      // If reconnecting with restored sync state, apply it
      if (data.isReconnect && data.syncState) {
        console.log('Restoring sync state from server:', data.syncState);
        setSyncState({
          gameTime: {
            // Support both 'period' (new) and 'quarter' (backwards compat)
            period: data.syncState.period ?? data.syncState.quarter,
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

      if (data.sportType) {
        console.log(`Room sport type: ${data.sportType}`);
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

    // Phase 2: Game time sync events (updated Phase 8 for multi-sport)
    socket.on('sync-confirmed', (data) => {
      console.log('Game time sync confirmed:', data);
      setSyncState({
        // Support both 'period' (new) and 'quarter' (backwards compat)
        gameTime: {
          period: data.period ?? data.quarter,
          minutes: data.minutes,
          seconds: data.seconds
        },
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
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      clearStoredSession();
      setPendingAutoReconnect(false);
      setError(data.message);
    });

    // Error events
    socket.on('error', (data) => {
      console.error('Server error:', data);
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setPendingAutoReconnect(false);
      setError(data.message);
    });

    // Cleanup on unmount
    return () => {
      // Clear reconnect timeout if pending
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      socket.disconnect();
    };
  }, [setConnected, setReconnecting, setConnectionError, setPendingAutoReconnect, setRoom, clearRoom, setUsers, addUser, removeUser, setMessages, addMessage, setError, setSyncState, updateUserSync]);

  // Join a room (with session support for reconnection)
  // sportType is only used when creating a new room (first joiner sets sport)
  // roomMetadata is optional: { roomName, teams, gameDate } - only used when creating
  const joinRoom = useCallback((roomId, nickname, sportType = 'basketball', roomMetadata = null) => {
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

      socketRef.current.emit('join-room', {
        roomId,
        nickname,
        sessionId,
        sportType,
        // Include metadata only when creating a new room
        ...(roomMetadata && {
          roomName: roomMetadata.roomName,
          teams: roomMetadata.teams,
          gameDate: roomMetadata.gameDate
        })
      });
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

  // Phase 2: Sync game time (updated Phase 8 for multi-sport)
  // Uses 'period' as generic term (works for quarters, periods, halves)
  const syncGameTime = useCallback((period, minutes, seconds) => {
    if (socketRef.current) {
      socketRef.current.emit('sync-game-time', { period, minutes, seconds });
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
