import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check } from 'lucide-react';
import { getAllSports, DEFAULT_SPORT } from '../lib/sportConfig';

/**
 * Generate a random room code like "GAME-X7K2"
 */
function generateRoomCode() {
  const words = ['GAME', 'MATCH', 'WATCH', 'LIVE', 'PLAY', 'TEAM', 'CHAT'];
  const word = words[Math.floor(Math.random() * words.length)];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${word}-${suffix}`;
}

/**
 * CreateRoomModal Component
 *
 * Modal dialog for creating a new game room with metadata.
 */
function CreateRoomModal({ open, onClose, onCreateRoom, defaultNickname = '', error, isConnected }) {
  const [roomName, setRoomName] = useState('');
  const [teams, setTeams] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [nickname, setNickname] = useState(defaultNickname);
  const [selectedSport, setSelectedSport] = useState(DEFAULT_SPORT);
  const [generatedCode] = useState(() => generateRoomCode());
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Update nickname when defaultNickname changes
  useEffect(() => {
    if (defaultNickname && !nickname) {
      setNickname(defaultNickname);
    }
  }, [defaultNickname]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setRoomName('');
      setTeams('');
      setGameDate('');
      setSelectedSport(DEFAULT_SPORT);
      setCopied(false);
      setValidationError('');
    }
  }, [open]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(`Copy failed. Your room code is: ${generatedCode}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 1) {
      setValidationError('Please enter a nickname.');
      return;
    }
    if (trimmedNickname.length > 30) {
      setValidationError('Nickname must be 30 characters or less.');
      return;
    }

    // Pass all room data to parent
    onCreateRoom({
      roomCode: generatedCode,
      roomName: roomName.trim() || null,
      teams: teams.trim() || null,
      gameDate: gameDate || null,
      sportType: selectedSport,
      nickname: trimmedNickname,
    });
  };

  const sports = getAllSports();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Game Room</DialogTitle>
          <DialogDescription>
            Set up a room for your watch party
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div className="space-y-2">
            <Label htmlFor="roomName">Room Name</Label>
            <Input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Super Bowl Watch Party"
              maxLength={100}
            />
          </div>

          {/* Sport Selector */}
          <div className="space-y-2">
            <Label>Sport</Label>
            <div className="grid grid-cols-4 gap-2">
              {sports.map((sport) => (
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

          {/* Teams (optional) */}
          <div className="space-y-2">
            <Label htmlFor="teams">
              Teams <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              type="text"
              id="teams"
              value={teams}
              onChange={(e) => setTeams(e.target.value)}
              placeholder="Chiefs vs Eagles"
              maxLength={100}
            />
          </div>

          {/* Game Date (optional) */}
          <div className="space-y-2">
            <Label htmlFor="gameDate">
              Game Date <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              type="date"
              id="gameDate"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />
          </div>

          {/* Nickname */}
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

          {/* Room Code (auto-generated) */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Room Code</p>
                <p className="font-mono text-lg font-semibold">{generatedCode}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Share this code with friends so they can join
            </p>
          </div>

          {validationError && (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

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
            {!isConnected ? 'Connecting...' : 'Create Room'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateRoomModal;
