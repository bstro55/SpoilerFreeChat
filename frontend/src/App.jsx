import { useEffect } from 'react';
import useChatStore from './store/chatStore';
import useAuthStore from './store/authStore';
import useSocket from './hooks/useSocket';
import HomePage from './components/HomePage';
import ChatRoom from './components/ChatRoom';
import { Spinner } from './components/ui/spinner';

/**
 * Main App Component
 *
 * Handles the top-level routing between the join screen and chat room.
 * Initializes auth and socket connection on mount.
 */
function App() {
  const { joinRoom, sendMessage, leaveRoom, syncGameTime } = useSocket();
  const { roomId, pendingAutoReconnect, viewingHome } = useChatStore();
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Spinner size="lg" />
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  // Show reconnecting state while auto-reconnecting to stored session
  if (pendingAutoReconnect && !roomId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Spinner size="lg" />
        <div className="text-muted-foreground text-sm">Reconnecting to room...</div>
      </div>
    );
  }

  // Determine which view to show:
  // - No room: HomePage (has its own header)
  // - In room + viewingHome: HomePage (handles "Return to Room" internally)
  // - In room + not viewingHome: ChatRoom (has its own header with Home button)
  const showHomePage = !roomId || viewingHome;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showHomePage ? (
        <HomePage onJoin={joinRoom} />
      ) : (
        <ChatRoom
          onSendMessage={sendMessage}
          onLeaveRoom={leaveRoom}
          onSyncGameTime={syncGameTime}
        />
      )}
    </div>
  );
}

export default App;
