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
import { Home } from 'lucide-react';
import { getSportConfig } from '../lib/sportConfig';

/**
 * ChatRoom Component
 *
 * The main chat interface showing messages, user list, and message input.
 */
const RESYNC_REMINDER_MS = 20 * 60 * 1000;
const RESYNC_CHECK_INTERVAL_MS = 60 * 1000;

function ChatRoom({ onSendMessage, onLeaveRoom, onSyncGameTime }) {
  const [inputValue, setInputValue] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [showResyncReminder, setShowResyncReminder] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
    teams
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
    }
    setPendingMessage('');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
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
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Home button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewingHome(true)}
              title="Go to Home"
            >
              <Home className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xl" title={sportConfig.label}>{sportConfig.emoji}</span>
              <div>
                <h2 className="text-lg font-semibold text-foreground leading-tight">
                  {roomName || `Room: ${roomId}`}
                </h2>
                {teams && (
                  <p className="text-sm text-muted-foreground">{teams}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary">
              {users.length} user{users.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {isSynced && (
              <Badge variant="outline">{offsetFormatted}</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Chatting as: <strong className="text-foreground">{nickname}</strong>
            </span>
            <AuthButton />
            <Button variant="outline" size="sm" onClick={onLeaveRoom}>
              Leave Room
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-border bg-muted flex flex-col overflow-hidden">
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            <TimeSync onSync={onSyncGameTime} />

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">In This Room</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <ul className="space-y-2">
                  {users.map((user) => (
                    <li
                      key={user.id}
                      className={`flex items-center justify-between text-sm ${
                        user.nickname === nickname ? 'font-medium' : ''
                      }`}
                    >
                      <span>
                        {user.nickname}
                        {user.nickname === nickname && (
                          <span className="text-muted-foreground"> (you)</span>
                        )}
                      </span>
                      <Badge
                        variant={user.isSynced ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.isSynced ? user.offsetFormatted : 'Not synced'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
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
                      Remember to sync your game time in the sidebar!
                    </p>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[80%] ${
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

            {!isSynced && messages.length > 0 && (
              <Alert>
                <AlertDescription>
                  Sync your game time in the sidebar to enable spoiler-free messaging
                </AlertDescription>
              </Alert>
            )}

            {showResyncReminder && (
              <Alert>
                <AlertDescription className="flex items-center justify-between">
                  <span>It's been a while since you synced. Is your game time still accurate?</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setShowSyncModal(true)}>
                      Resync Now
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

      <SyncModal
        isOpen={showSyncModal}
        onClose={handleModalClose}
        onSync={onSyncGameTime}
        title="Sync Required"
        subtitle="Please sync your game time before sending messages"
      />
    </div>
  );
}

export default ChatRoom;
