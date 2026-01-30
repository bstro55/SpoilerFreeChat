import { useState, useRef, useEffect } from 'react';
import useChatStore from '../store/chatStore';
import TimeSync from './TimeSync';

/**
 * ChatRoom Component
 *
 * The main chat interface showing messages, user list, and message input.
 * Phase 2 adds game time synchronization to calculate viewer offsets.
 *
 * Props:
 * - onSendMessage: Function to send a chat message
 * - onLeaveRoom: Function to leave the current room
 * - onSyncGameTime: Function to sync game time (quarter, minutes, seconds)
 */
function ChatRoom({ onSendMessage, onLeaveRoom, onSyncGameTime }) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { roomId, nickname, users, messages, error, clearError, isSynced, offsetFormatted } = useChatStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    clearError();

    const content = inputValue.trim();
    if (content.length === 0 || content.length > 500) {
      return;
    }

    onSendMessage(content);
    setInputValue('');
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chat-room-container">
      {/* Header */}
      <header className="chat-header">
        <div className="room-info">
          <h2>Room: {roomId}</h2>
          <span className="user-count">{users.length} user{users.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="header-right">
          {/* Show offset status in header when synced */}
          {isSynced && (
            <span className="offset-badge">
              {offsetFormatted}
            </span>
          )}
          <div className="user-info">
            <span>Chatting as: <strong>{nickname}</strong></span>
            <button onClick={onLeaveRoom} className="leave-button">
              Leave Room
            </button>
          </div>
        </div>
      </header>

      <div className="chat-main">
        {/* Sidebar with Time Sync and User List */}
        <aside className="sidebar">
          {/* Time Sync Component */}
          <TimeSync onSync={onSyncGameTime} />

          {/* User List */}
          <div className="user-list">
            <h3>In This Room</h3>
            <ul>
              {users.map((user) => (
                <li key={user.id} className={user.nickname === nickname ? 'current-user' : ''}>
                  <div className="user-name">
                    {user.nickname}
                    {user.nickname === nickname && ' (you)'}
                  </div>
                  <div className={`user-sync-status ${user.isSynced ? 'synced' : 'not-synced'}`}>
                    {user.isSynced ? user.offsetFormatted : 'Not synced'}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Messages Area */}
        <main className="messages-area">
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>No messages yet. Say hello!</p>
                {!isSynced && (
                  <p className="sync-reminder">
                    Remember to sync your game time in the sidebar!
                  </p>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.nickname === nickname ? 'own-message' : ''}`}
                >
                  <div className="message-header">
                    <span className="message-author">{message.nickname}</span>
                    <span className="message-time">{formatTime(message.timestamp)}</span>
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={clearError}>Dismiss</button>
            </div>
          )}

          {/* Sync Reminder Banner */}
          {!isSynced && messages.length > 0 && (
            <div className="sync-reminder-banner">
              Sync your game time in the sidebar to enable spoiler-free messaging
            </div>
          )}

          {/* Message Input */}
          <form onSubmit={handleSubmit} className="message-form">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
            />
            <button type="submit" disabled={inputValue.trim().length === 0}>
              Send
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

export default ChatRoom;
