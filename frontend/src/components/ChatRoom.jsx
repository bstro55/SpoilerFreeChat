import { useState, useRef, useEffect } from 'react';
import useChatStore from '../store/chatStore';

/**
 * ChatRoom Component
 *
 * The main chat interface showing messages, user list, and message input.
 * For Phase 1, this is a simple real-time chat without delay logic.
 */
function ChatRoom({ onSendMessage, onLeaveRoom }) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { roomId, nickname, users, messages, error, clearError } = useChatStore();

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
        <div className="user-info">
          <span>Chatting as: <strong>{nickname}</strong></span>
          <button onClick={onLeaveRoom} className="leave-button">
            Leave Room
          </button>
        </div>
      </header>

      <div className="chat-main">
        {/* User List Sidebar */}
        <aside className="user-list">
          <h3>In This Room</h3>
          <ul>
            {users.map((user) => (
              <li key={user.id} className={user.nickname === nickname ? 'current-user' : ''}>
                {user.nickname}
                {user.nickname === nickname && ' (you)'}
              </li>
            ))}
          </ul>
        </aside>

        {/* Messages Area */}
        <main className="messages-area">
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>No messages yet. Say hello!</p>
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
