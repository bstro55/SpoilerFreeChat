import useChatStore from '../store/chatStore';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home } from 'lucide-react';
import { getSportConfig } from '../lib/sportConfig';

/**
 * Header Component
 *
 * Persistent navigation header that shows:
 * - App name
 * - Breadcrumb trail (Home → Room: xyz)
 * - Home button when in a room (returns to JoinRoom without leaving room)
 */
function Header() {
  const { roomId, sportType, viewingHome, setViewingHome } = useChatStore();

  const sportConfig = sportType ? getSportConfig(sportType) : null;

  // Don't show header on pure home screen (no room)
  // Header is primarily useful when in a room to provide navigation back
  if (!roomId) {
    return null;
  }

  return (
    <header className="border-b border-border bg-card px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setViewingHome(true)}
          >
            <Home className="h-4 w-4 mr-1" />
            Home
          </Button>

          {!viewingHome && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                {sportConfig && (
                  <span title={sportConfig.label}>{sportConfig.emoji}</span>
                )}
                Room: {roomId}
              </span>
            </>
          )}
        </nav>

        {/* Show "Return to Room" when viewing home but still in a room */}
        {viewingHome && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setViewingHome(false)}
          >
            Return to Room
          </Button>
        )}
      </div>
    </header>
  );
}

export default Header;
