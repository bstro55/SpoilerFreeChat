import { useState } from 'react';
import useChatStore from '../store/chatStore';
import './TimeSync.css';

/**
 * TimeSync Component
 *
 * Allows users to input their current game time (quarter, minutes, seconds)
 * and sync with the server to calculate their offset from other viewers.
 *
 * Props:
 * - onSync: Function to call when user syncs (quarter, minutes, seconds)
 *
 * Basketball Format:
 * - 4 quarters, 12 minutes each
 * - Clock counts DOWN from 12:00 to 0:00
 * - Example: "8:42 left in Q3"
 */
function TimeSync({ onSync }) {
  // Local form state
  const [quarter, setQuarter] = useState(1);
  const [minutes, setMinutes] = useState(12);
  const [seconds, setSeconds] = useState(0);

  // Get sync status from store
  const { isSynced, gameTime, offsetFormatted, isBaseline } = useChatStore();

  // Handle form submission
  const handleSync = (e) => {
    e.preventDefault();

    // Convert to numbers and validate
    const q = parseInt(quarter, 10);
    const m = parseInt(minutes, 10);
    const s = parseInt(seconds, 10);

    // Basic client-side validation
    if (q < 1 || q > 4) {
      alert('Quarter must be 1-4');
      return;
    }
    if (m < 0 || m > 12) {
      alert('Minutes must be 0-12');
      return;
    }
    if (s < 0 || s > 59) {
      alert('Seconds must be 0-59');
      return;
    }
    // 12:XX is only valid when seconds is 0 (quarter start)
    if (m === 12 && s > 0) {
      alert('Time cannot exceed 12:00');
      return;
    }

    onSync(q, m, s);
  };

  // Format the current game time for display
  const formatGameTime = (gt) => {
    if (!gt) return null;
    return `Q${gt.quarter} ${gt.minutes}:${gt.seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="time-sync">
      <div className="time-sync-header">
        <h3>Sync Game Time</h3>
        <p className="time-sync-description">
          Enter the time shown on your broadcast to sync with other viewers
        </p>
        <p className="time-sync-tip">
          Tip: For best accuracy, sync right when the game clock changes
        </p>
      </div>

      <form onSubmit={handleSync} className="time-sync-form">
        <div className="time-inputs">
          {/* Quarter Selector */}
          <div className="input-group">
            <label htmlFor="quarter">Quarter</label>
            <select
              id="quarter"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
            >
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
          </div>

          {/* Minutes Input */}
          <div className="input-group">
            <label htmlFor="minutes">Minutes</label>
            <input
              type="number"
              id="minutes"
              min="0"
              max="12"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>

          {/* Colon separator */}
          <span className="time-separator">:</span>

          {/* Seconds Input */}
          <div className="input-group">
            <label htmlFor="seconds">Seconds</label>
            <input
              type="number"
              id="seconds"
              min="0"
              max="59"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="sync-button">
          {isSynced ? 'Resync' : 'Sync Time'}
        </button>
      </form>

      {/* Sync Status */}
      {isSynced && (
        <div className="sync-status">
          <div className="sync-status-row">
            <span className="sync-label">Your game time:</span>
            <span className="sync-value">{formatGameTime(gameTime)}</span>
          </div>
          <div className="sync-status-row">
            <span className="sync-label">Your delay:</span>
            <span className={`sync-value ${isBaseline ? 'baseline' : 'delayed'}`}>
              {offsetFormatted}
              {isBaseline && ' (You set the baseline)'}
            </span>
          </div>
        </div>
      )}

      {!isSynced && (
        <div className="sync-prompt">
          <p>Please sync your game time to enable spoiler-free chat</p>
        </div>
      )}
    </div>
  );
}

export default TimeSync;
