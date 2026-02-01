import { useEffect } from 'react';
import useChatStore from './store/chatStore';
import useAuthStore from './store/authStore';
import useSocket from './hooks/useSocket';
import JoinRoom from './components/JoinRoom';
import ChatRoom from './components/ChatRoom';

/**
 * Main App Component
 *
 * Handles the top-level routing between the join screen and chat room.
 * Initializes auth and socket connection on mount.
 */
function App() {
  const { joinRoom, sendMessage, leaveRoom, syncGameTime } = useSocket();
  const { roomId } = useChatStore();
  const { initialize, isLoading, profile } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Apply theme based on user preference
  useEffect(() => {
    const theme = profile?.theme || 'system';

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, [profile?.theme]);

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return roomId ? (
    <ChatRoom
      onSendMessage={sendMessage}
      onLeaveRoom={leaveRoom}
      onSyncGameTime={syncGameTime}
    />
  ) : (
    <JoinRoom onJoin={joinRoom} />
  );
}

export default App;
