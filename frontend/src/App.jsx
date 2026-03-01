import { useEffect, useState } from 'react';
import useChatStore from './store/chatStore';
import useAuthStore from './store/authStore';
import useSocket from './hooks/useSocket';
import HomePage from './components/HomePage';
import ChatRoom from './components/ChatRoom';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { Spinner } from './components/ui/spinner';

/**
 * Main App Component
 *
 * Handles the top-level routing between the join screen and chat room.
 * Initializes auth and socket connection on mount.
 */
function App() {
  const { joinRoom, sendMessage, leaveRoom, syncGameTime, reportMessage, startCountdown } = useSocket();
  const { roomId, pendingAutoReconnect, viewingHome } = useChatStore();
  const { initialize, isLoading, profile } = useAuthStore();

  // Extract room code from /join/:roomCode invite URLs
  const [prefillRoomCode] = useState(() => {
    const match = window.location.pathname.match(/^\/join\/([A-Z0-9-]+)$/i);
    if (match) {
      // Clean the URL so the address bar shows '/' after extraction
      window.history.replaceState({}, '', '/');
      return match[1].toUpperCase();
    }
    return '';
  });

  // Simple path-based routing for legal pages
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path === '/privacy') return 'privacy';
    if (path === '/terms') return 'terms';
    return 'home';
  });

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/privacy') setCurrentPage('privacy');
      else if (path === '/terms') setCurrentPage('terms');
      else setCurrentPage('home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation helper
  const navigateTo = (page) => {
    const path = page === 'home' ? '/' : `/${page}`;
    window.history.pushState({}, '', path);
    setCurrentPage(page);
  };

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

  // Handle legal pages first (these render regardless of room state)
  if (currentPage === 'privacy') {
    return <PrivacyPolicy onBack={() => navigateTo('home')} />;
  }
  if (currentPage === 'terms') {
    return <TermsOfService onBack={() => navigateTo('home')} />;
  }

  // Determine which view to show:
  // - No room: HomePage (has its own header)
  // - In room + viewingHome: HomePage (handles "Return to Room" internally)
  // - In room + not viewingHome: ChatRoom (has its own header with Home button)
  const showHomePage = !roomId || viewingHome;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showHomePage ? (
        <HomePage onJoin={joinRoom} onNavigate={navigateTo} prefillRoomCode={prefillRoomCode} />
      ) : (
        <ChatRoom
          onSendMessage={sendMessage}
          onLeaveRoom={leaveRoom}
          onSyncGameTime={syncGameTime}
          onReportMessage={reportMessage}
          onStartCountdown={startCountdown}
        />
      )}
    </div>
  );
}

export default App;
