import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useChatStore from '../store/chatStore';

/**
 * Socket.IO Connection Hook
 *
 * Manages the WebSocket connection to the server and handles all socket events.
 * This hook is designed to be used once at the app level.
 *
 * Returns:
 * - socket: The Socket.IO socket instance
 * - joinRoom: Function to join a room
 * - sendMessage: Function to send a message
 * - leaveRoom: Function to leave the current room
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);

  // Get store actions
  const {
    setConnected,
    setRoom,
    clearRoom,
    setUsers,
    addUser,
    removeUser,
    setMessages,
    addMessage,
    setError
  } = useChatStore();

  // Initialize socket connection
  useEffect(() => {
    // Create socket connection
    socketRef.current = io(SOCKET_URL, {
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Unable to connect to server');
    });

    // Room events
    socket.on('joined-room', (data) => {
      console.log('Joined room:', data);
      setRoom(data.roomId, data.nickname);
      setUsers(data.users);
      setMessages(data.messages || []);
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

    // Error events
    socket.on('error', (data) => {
      console.error('Server error:', data);
      setError(data.message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [setConnected, setRoom, clearRoom, setUsers, addUser, removeUser, setMessages, addMessage, setError]);

  // Join a room
  const joinRoom = useCallback((roomId, nickname) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', { roomId, nickname });
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
      socketRef.current.disconnect();
      socketRef.current.connect();
      clearRoom();
    }
  }, [clearRoom]);

  return {
    socket: socketRef.current,
    joinRoom,
    sendMessage,
    leaveRoom
  };
}

export default useSocket;
