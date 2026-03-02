import { useState, useRef, useEffect } from 'react';
import useChatStore from '../store/chatStore';
import AuthButton from './AuthButton';
import TimeSync from './TimeSync';
import SyncModal from './SyncModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Home, Menu, X, Clock, Copy, Check, Link2, Flag } from 'lucide-react';
import { getSportConfig } from '../lib/sportConfig';

/**
 * ChatRoom Component
 *
 * The main chat interface showing messages, user list, and message input.
 */
const RESYNC_REMINDER_MS = 20 * 60 * 1000;
const RESYNC_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * Format a timestamp as relative time (e.g., "just now", "2m ago")
 */
function formatRelativeSyncTime(timestamp) {
  if (!timestamp) return null;
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function ChatRoom({ onSendMessage, onLeaveRoom, onSyncGameTime, onReportMessage, onStartCountdown }) {
  const [inputValue, setInputValue] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [showResyncReminder, setShowResyncReminder] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [reportedMessageIds, setReportedMessageIds] = useState(new Set());
  const [, setTick] = useState(0);  // Force re-render for relative time updates
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Update relative sync times every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const {
    roomId,
    nickname,
    users,
    messages,
    error,
    clearError,
    isSynced,
    offsetFormatted,
    lastSyncTime,
    isConnected,
    isReconnecting,
    connectionError,
    sportType,
    setViewingHome,
    // Room metadata (Phase 11)
    roomName,
    teams,
    // Countdown sync state
    countdownActive,
    countdownValue,
    autoSyncTrigger,
  } = useChatStore();

  // Get sport config for display
  const sportConfig = getSportConfig(sportType);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isSynced || !lastSyncTime) return;

    const checkResyncNeeded = () => {
      const elapsed = Date.now() - lastSyncTime;
      if (elapsed >= RESYNC_REMINDER_MS) {
        setShowResyncReminder(true);
      }
    };

    checkResyncNeeded();
    const interval = setInterval(checkResyncNeeded, RESYNC_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isSynced, lastSyncTime]);

  useEffect(() => {
    setShowResyncReminder(false);
  }, [lastSyncTime]);

  const handleSubmit = (e) => {
    e.preventDefault();
    clearError();

    const content = inputValue.trim();
    if (content.length === 0 || content.length > 500) {
      return;
    }

    if (!isSynced) {
      setPendingMessage(content);
      setShowSyncModal(true);
      return;
    }

    onSendMessage(content);
    setInputValue('');
  };

  const handleModalClose = () => {
    setShowSyncModal(false);
    if (isSynced && pendingMessage) {
      onSendMessage(pendingMessage);
      setInputValue('');
      setPendingMessage('');
    } else if (pendingMessage) {
      // User dismissed without syncing — restore their message to the input
      setInputValue(pendingMessage);
      setPendingMessage('');
    } else {
      setPendingMessage('');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(`Copy failed. Your room code is: ${roomId}`);
    }
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/join/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      alert(`Copy failed. Your invite link is: ${link}`);
    }
  };

  const handleReport = (message) => {
    if (reportedMessageIds.has(message.id)) return;
    const confirmed = window.confirm(
      `Report this message from ${message.nickname}?\n\n"${message.content.slice(0, 100)}${message.content.length > 100 ? '…' : ''}"`
    );
    if (!confirmed) return;
    onReportMessage(message.content, message.nickname, () => {
      setReportedMessageIds((prev) => new Set([...prev, message.id]));
    });
  };

  return (
    <>
    {/* Countdown sync overlay — covers the screen during 3-2-1 sync */}
    {countdownActive && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 pointer-events-none">
        <div className="text-center text-white select-none">
          <p className="text-xl mb-6 opacity-75 font-medium">Get your game clock ready...</p>
          {countdownValue === 0 ? (
            <p className="text-6xl font-bold tracking-tight text-primary animate-pulse">SYNC NOW!</p>
          ) : countdownValue !== null ? (
            <p className="text-9xl font-bold tabular-nums">{countdownValue}</p>
          ) : null}
        </div>
      </div>
    )}
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Connection Status Banner */}
      {(!isConnected || isReconnecting || connectionError) && (
        <div className={`px-4 py-2 text-center text-sm ${
          isReconnecting
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
        }`}>
          {isReconnecting
            ? 'Reconnecting to server...'
            : connectionError || 'Connection lost'}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Sidebar toggle (mobile only) */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
            {/* Home button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hidden sm:flex"
              onClick={() => setViewingHome(true)}
              title="Go to Home"
            >
              <Home className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl flex-shrink-0" title={sportConfig.label}>{sportConfig.emoji}</span>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-foreground leading-tight truncate">
                  {roomName || `Room: ${roomId}`}
                </h2>
                {teams && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{teams}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {users.length} user{users.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isSynced && (
              <Badge variant="outline" className="hidden sm:inline-flex">{offsetFormatted}</Badge>
            )}
            <span className="text-sm text-muted-foreground hidden md:inline">
              Chatting as: <strong className="text-foreground">{nickname}</strong>
            </span>
            <AuthButton />
            <Button variant="outline" size="sm" onClick={onLeaveRoom} className="hidden sm:inline-flex">
              Leave
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - hidden on mobile, slides in when toggled */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:relative
          inset-y-0 left-0
          z-50 lg:z-auto
          w-64
          border-r border-border bg-muted
          flex flex-col overflow-hidden
          transition-transform duration-200 ease-in-out
          lg:transition-none
        `}>
          {/* Mobile sidebar header */}
          <div className="flex items-center justify-between p-3 border-b border-border lg:hidden">
            <span className="font-semibold text-sm">Game Settings</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-3 flex-1 overflow-y-auto space-y-3">
            {/* Room Code — compact single row */}
            <div className="flex items-center gap-1.5 px-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Room Code</p>
                <code className="font-mono text-sm font-semibold">{roomId}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 gap-1 flex-shrink-0"
                onClick={copyRoomCode}
                aria-label="Copy room code"
                title="Copy room code"
              >
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 gap-1 flex-shrink-0"
                onClick={copyInviteLink}
                aria-label="Copy invite link"
                title="Copy invite link"
              >
                {linkCopied ? <Check className="h-3 w-3 text-green-500" /> : <Link2 className="h-3 w-3" />}
              </Button>
            </div>

            <TimeSync
              onSync={onSyncGameTime}
              autoSyncTrigger={autoSyncTrigger}
              onStartCountdown={onStartCountdown}
            />

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm">In This Room</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <ul className="space-y-2">
                  {users.map((user) => (
                    <li key={user.id} className="text-sm">
                      <p className={`leading-snug ${user.nickname === nickname ? 'font-medium' : ''}`}>
                        {user.nickname}
                        {user.nickname === nickname && (
                          <span className="text-muted-foreground font-normal"> (you)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant={user.isSynced ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.isSynced ? user.offsetFormatted : 'Not synced'}
                        </Badge>
                        {user.isSynced && user.syncedAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeSyncTime(user.syncedAt)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Mobile sidebar footer with Leave button */}
          <div className="p-3 border-t border-border lg:hidden space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => {
                setSidebarOpen(false);
                setViewingHome(true);
              }}
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8"
              onClick={onLeaveRoom}
            >
              Leave Room
            </Button>
          </div>
        </aside>

        {/* Messages Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No messages yet. Say hello!</p>
                  {!isSynced && (
                    <p className="mt-2 text-sm">
                      <span className="hidden lg:inline">Remember to sync your game time in the sidebar!</span>
                      <span className="lg:hidden">
                        Tap the <Menu className="inline h-4 w-4 mx-1" /> menu to sync your game time!
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`group relative max-w-[80%] ${
                      message.nickname === nickname ? 'ml-auto' : ''
                    }`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 shadow-sm ${
                        message.nickname === nickname
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="font-medium text-sm">{message.nickname}</span>
                        <span className={`text-xs ${
                          message.nickname === nickname
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm break-words">{message.content}</p>
                    </div>
                    {/* Report button — only on other people's messages, appears on hover */}
                    {message.nickname !== nickname && onReportMessage && (
                      <button
                        onClick={() => handleReport(message)}
                        className="absolute -top-1 -right-6 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive"
                        aria-label="Report message"
                        title={reportedMessageIds.has(message.id) ? 'Reported' : 'Report message'}
                        disabled={reportedMessageIds.has(message.id)}
                      >
                        <Flag className={`h-3 w-3 ${reportedMessageIds.has(message.id) ? 'text-destructive' : ''}`} />
                      </button>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Banners */}
          <div className="px-4 space-y-2">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button variant="ghost" size="sm" onClick={clearError}>
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {!isSynced && (
              <Alert>
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    <strong>Spoiler protection is OFF</strong> — messages have no delay until you sync.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
                    onClick={() => setSidebarOpen(true)}
                  >
                    Sync Now
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {showResyncReminder && (
              <Alert>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-sm">It's been a while since you synced. Is your game time still accurate?</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => setShowSyncModal(true)}>
                      Resync
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowResyncReminder(false)}>
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Message Input */}
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isConnected ? "Type a message..." : "Reconnecting..."}
                maxLength={500}
                className="flex-1"
                disabled={!isConnected}
              />
              <Button
                type="submit"
                disabled={inputValue.trim().length === 0 || !isConnected}
              >
                Send
              </Button>
            </div>
            <div className={`text-xs mt-1 text-right ${
              inputValue.length > 450
                ? inputValue.length >= 500
                  ? 'text-red-500'
                  : 'text-yellow-600'
                : 'text-muted-foreground'
            }`}>
              {inputValue.length}/500
            </div>
          </form>
        </main>
      </div>

      {/* Mobile Floating Sync Button - shown for unsynced users on mobile */}
      {!isSynced && (
        <div className="fixed bottom-24 right-4 lg:hidden z-30">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 px-5 gap-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Clock className="h-5 w-5" />
            <span>Sync Now</span>
          </Button>
        </div>
      )}

      <SyncModal
        isOpen={showSyncModal}
        onClose={handleModalClose}
        onSync={onSyncGameTime}
        title="Sync Required"
        subtitle="Please sync your game time before sending messages"
      />
    </div>
    </>
  );
}

export default ChatRoom;
