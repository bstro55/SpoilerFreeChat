import { useState } from 'react';
import useChatStore from '../store/chatStore';

/**
 * JoinRoom Component
 *
 * Displays a form for users to enter their nickname and join a chat room.
 * For Phase 1, we use a hardcoded room ID to keep things simple.
 */
function JoinRoom({ onJoin }) {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const { isConnected, error, clearError } = useChatStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    clearError();

    // Basic validation
    const trimmedNickname = nickname.trim();
    const trimmedRoomCode = roomCode.trim() || 'demo-room'; // Default to demo room

    if (trimmedNickname.length < 1 || trimmedNickname.length > 30) {
      return;
    }

    onJoin(trimmedRoomCode, trimmedNickname);
  };

  return (
    <div className="join-room-container">
      <div className="join-room-card">
        <h1>SpoilerFreeChat</h1>
        <p className="tagline">Watch together, chat without spoilers</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nickname">Your Nickname</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              maxLength={30}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="roomCode">Room Code (optional)</label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Leave empty for demo room"
              maxLength={50}
            />
            <small>Leave empty to join the demo room</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={!isConnected || nickname.trim().length === 0}>
            {isConnected ? 'Join Room' : 'Connecting...'}
          </button>
        </form>

        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Connected to server' : 'Connecting to server...'}
        </div>
      </div>
    </div>
  );
}

export default JoinRoom;
