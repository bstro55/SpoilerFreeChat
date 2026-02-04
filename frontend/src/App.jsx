import { useEffect } from 'react';
import useChatStore from './store/chatStore';
import useAuthStore from './store/authStore';
import useSocket from './hooks/useSocket';
import Header from './components/Header';
import JoinRoom from './components/JoinRoom';
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
  // - No room: JoinRoom (no header needed)
  // - In room + viewingHome: Header + JoinRoom (with "Return to Room" option)
  // - In room + not viewingHome: ChatRoom (has its own header with Home button)
  const showJoinRoom = !roomId || viewingHome;
  const showHeader = roomId && viewingHome; // Only show header when viewing home while in room

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showHeader && <Header />}
      {showJoinRoom ? (
        <JoinRoom onJoin={joinRoom} />
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
