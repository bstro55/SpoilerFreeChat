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
import { Clock } from 'lucide-react';

/**
 * JoinRoom Component
 *
 * Displays a form for users to enter their nickname and join a chat room.
 * Shows auth button for sign in/out and recent rooms for authenticated users.
 */
function JoinRoom({ onJoin }) {
  const { profile, session, fetchRecentRooms } = useAuthStore();
  const { isConnected, error, clearError } = useChatStore();

  // Initialize nickname from preferences if available
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [recentRooms, setRecentRooms] = useState([]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    clearError();

    const trimmedNickname = nickname.trim();
    const trimmedRoomCode = roomCode.trim() || 'demo-room';

    if (trimmedNickname.length < 1 || trimmedNickname.length > 30) {
      return;
    }

    onJoin(trimmedRoomCode, trimmedNickname);
  };

  // Quick join from recent room
  const handleQuickJoin = (room) => {
    clearError();
    onJoin(room.roomCode, room.nickname);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">SpoilerFreeChat</CardTitle>
              <CardDescription>Watch together, chat without spoilers</CardDescription>
            </div>
            <AuthButton />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="roomCode">Room Code (optional)</Label>
              <Input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Leave empty for demo room"
                maxLength={50}
              />
              <p className="text-sm text-zinc-500">
                Leave empty to join the demo room
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!isConnected || nickname.trim().length === 0}
            >
              {isConnected ? 'Join Room' : 'Connecting...'}
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
                  {recentRooms.slice(0, 3).map((room) => (
                    <Button
                      key={room.roomCode}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleQuickJoin(room)}
                      disabled={!isConnected}
                    >
                      <div>
                        <div className="font-medium">{room.roomCode}</div>
                        <div className="text-xs text-muted-foreground">
                          as {room.nickname}
                        </div>
                      </div>
                    </Button>
                  ))}
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
