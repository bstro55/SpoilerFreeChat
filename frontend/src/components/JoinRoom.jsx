import { useState } from 'react';
import useChatStore from '../store/chatStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

/**
 * JoinRoom Component
 *
 * Displays a form for users to enter their nickname and join a chat room.
 */
function JoinRoom({ onJoin }) {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const { isConnected, error, clearError } = useChatStore();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">SpoilerFreeChat</CardTitle>
          <CardDescription>Watch together, chat without spoilers</CardDescription>
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
              <p className="text-sm text-muted-foreground">
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
