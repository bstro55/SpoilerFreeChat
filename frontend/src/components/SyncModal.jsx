import { useEffect } from 'react';
import useChatStore from '../store/chatStore';
import TimeSync from './TimeSync';
import './SyncModal.css';

/**
 * SyncModal Component
 *
 * A modal that displays the TimeSync form when users need to sync their game time.
 * Used to require sync before sending messages.
 *
 * Props:
 * - isOpen: Whether the modal is visible
 * - onClose: Function to close the modal
 * - onSync: Function to call when user syncs (passes to TimeSync)
 * - title: Modal header title
 * - subtitle: Modal header description
 */
function SyncModal({ isOpen, onClose, onSync, title, subtitle }) {
  // Watch for sync completion to auto-close modal
  const { isSynced } = useChatStore();

  // Auto-close when user successfully syncs
  useEffect(() => {
    if (isOpen && isSynced) {
      onClose();
    }
  }, [isSynced, isOpen, onClose]);

  // Handle escape key to close (must be before conditional return to follow Rules of Hooks)
  useEffect(() => {
    if (!isOpen) return; // Only add listener when modal is open

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  // Handle backdrop click (close modal)
  const handleBackdropClick = (e) => {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="sync-modal-backdrop" onClick={handleBackdropClick}>
      <div className="sync-modal-content">
        <div className="sync-modal-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          <button
            className="sync-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="sync-modal-body">
          <TimeSync onSync={onSync} />
        </div>
      </div>
    </div>
  );
}

export default SyncModal;
