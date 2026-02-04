import { useState, useEffect } from 'react';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';
import AuthButton from './AuthButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, ArrowLeft, Copy, Check, Plus, Users, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllSports, DEFAULT_SPORT, getSportConfig } from '../lib/sportConfig';

/**
 * Generate a random room code like "GAME-X7K2"
 */
function generateRoomCode() {
  const words = ['GAME', 'MATCH', 'WATCH', 'LIVE', 'PLAY', 'TEAM', 'CHAT'];
  const word = words[Math.floor(Math.random() * words.length)];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like 0/O, 1/I/L
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${word}-${suffix}`;
}

/**
 * JoinRoom Component
 *
 * Displays options to create or join a chat room.
 * Create mode: generates a shareable room code
 * Join mode: enter an existing room code
 */
function JoinRoom({ onJoin }) {
  const { profile, session, fetchRecentRooms } = useAuthStore();
  const { isConnected, error, clearError, roomId, sportType: currentRoomSportType, setViewingHome } = useChatStore();

  // Check if user is viewing home while still in a room
  const isInRoom = !!roomId;
  const currentRoomSport = isInRoom ? getSportConfig(currentRoomSportType) : null;

  // Mode: 'create' or 'join'
  const [mode, setMode] = useState('create');

  // Form state
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState(() => generateRoomCode());
  const [recentRooms, setRecentRooms] = useState([]);
  const [selectedSport, setSelectedSport] = useState(DEFAULT_SPORT);
  const [copied, setCopied] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Set initial nickname from preferences when profile loads
  useEffect(() => {
    if (profile?.preferredNickname && !nickname) {
      setNickname(profile.preferredNickname);
    }
  }, [profile?.preferredNickname]);

  // Fetch recent rooms when user is authenticated
  useEffect(() => {
    if (session) {
      fetchRecentRooms().then(setRecentRooms);
    } else {
      setRecentRooms([]);
    }
  }, [session, fetchRecentRooms]);

  // Generate new code when switching to create mode
  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === 'create') {
      setGeneratedCode(generateRoomCode());
    }
    setCopied(false);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    clearError();

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 1 || trimmedNickname.length > 30) {
      return;
    }

    const roomCode = mode === 'create' ? generatedCode : joinCode.trim().toUpperCase();
    if (!roomCode) {
      return;
    }

    onJoin(roomCode, trimmedNickname, selectedSport);
  };

  // Quick join from recent room
  const handleQuickJoin = (room) => {
    clearError();
    onJoin(room.roomCode, room.nickname, room.sportType || DEFAULT_SPORT);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">SpoilerFreeChat</CardTitle>
              <CardDescription>Watch together, chat without spoilers</CardDescription>
            </div>
            <AuthButton />
          </div>

          {/* How it works - collapsible explainer */}
          <button
            type="button"
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-2 transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            How it works
            {showHowItWorks ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showHowItWorks && (
            <div className="mt-3 p-3 bg-muted rounded-md text-sm space-y-2">
              <p>
                <strong>The problem:</strong> Streaming delays vary between viewers.
                If you're behind, a friend on cable TV might spoil the game!
              </p>
              <p>
                <strong>The solution:</strong> Everyone syncs their game clock.
                Messages are delayed so you only see them when you've "caught up"
                to that moment in the game.
              </p>
              <p className="text-muted-foreground">
                No more spoilers. Watch at your own pace.
              </p>
            </div>
          )}

          {/* Why sign in hint - only show if not signed in */}
          {!session && (
            <p className="text-xs text-muted-foreground mt-3">
              <strong>Tip:</strong> Sign in to save your nickname, remember recent rooms, and customize your theme.
            </p>
          )}

          {/* Show notice when user is in a room but viewing home */}
          {isInRoom && (
            <Alert className="mt-4">
              <AlertDescription className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span>{currentRoomSport?.emoji}</span>
                  You're still in room: <strong>{roomId}</strong>
                </span>
                <Button size="sm" onClick={() => setViewingHome(false)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Return
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent>
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={mode === 'create' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleModeChange('create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Room
            </Button>
            <Button
              type="button"
              variant={mode === 'join' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleModeChange('join')}
            >
              <Users className="h-4 w-4 mr-2" />
              Join Room
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nickname - always shown */}
            <div className="space-y-2">
              <Label htmlFor="nickname">Your Nickname</Label>
              <Input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                maxLength={30}
                required
              />
            </div>

            {/* Create Mode: Show generated code */}
            {mode === 'create' && (
              <>
                <div className="space-y-2">
                  <Label>Your Room Code</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-lg font-semibold text-center">
                      {generatedCode}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyCode}
                      title="Copy room code"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this code with friends so they can join
                  </p>
                </div>

                {/* Sport Selector - only in create mode */}
                <div className="space-y-2">
                  <Label>Sport</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {getAllSports().map((sport) => (
                      <Button
                        key={sport.id}
                        type="button"
                        variant={selectedSport === sport.id ? 'default' : 'outline'}
                        className="h-auto py-2 flex flex-col items-center gap-0.5"
                        onClick={() => setSelectedSport(sport.id)}
                      >
                        <span className="text-lg">{sport.emoji}</span>
                        <span className="text-xs font-medium">{sport.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Join Mode: Enter room code */}
            {mode === 'join' && (
              <div className="space-y-2">
                <Label htmlFor="joinCode">Room Code</Label>
                <Input
                  type="text"
                  id="joinCode"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code (e.g., GAME-X7K2)"
                  maxLength={20}
                  className="font-mono uppercase"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter the code shared by your friend
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!isConnected || nickname.trim().length === 0 || (mode === 'join' && !joinCode.trim())}
            >
              {!isConnected ? 'Connecting...' : mode === 'create' ? 'Create & Join Room' : 'Join Room'}
            </Button>
          </form>

          {/* Recent Rooms (for authenticated users) */}
          {recentRooms.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Recent Rooms
                </Label>
                <div className="space-y-1">
                  {recentRooms.slice(0, 3).map((room) => {
                    const sports = getAllSports();
                    const roomSport = sports.find(s => s.id === room.sportType) || sports[0];
                    return (
                      <Button
                        key={room.roomCode}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => handleQuickJoin(room)}
                        disabled={!isConnected}
                      >
                        <span className="mr-2">{roomSport.emoji}</span>
                        <div>
                          <div className="font-medium font-mono">{room.roomCode}</div>
                          <div className="text-xs text-muted-foreground">
                            as {room.nickname}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected to server' : 'Connecting to server...'}
          </Badge>
        </CardFooter>
      </Card>
    </div>
  );
}

export default JoinRoom;
