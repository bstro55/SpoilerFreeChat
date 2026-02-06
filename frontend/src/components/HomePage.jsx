import { useState, useEffect } from 'react';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';
import AuthButton from './AuthButton';
import CreateRoomModal from './CreateRoomModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  Users,
  Zap,
  Plus,
  ArrowRight,
  ArrowLeft,
  Shield,
  Calendar,
} from 'lucide-react';
import { getAllSports, DEFAULT_SPORT, getSportConfig } from '../lib/sportConfig';

/**
 * Feature Card Component
 */
function FeatureCard({ icon: Icon, title, description, color }) {
  return (
    <Card className="card-hover p-6 text-center">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}

/**
 * Room Card Component for Recent Rooms
 */
function RoomCard({ room, onClick, disabled }) {
  const sports = getAllSports();
  const sport = sports.find((s) => s.id === room.sportType) || sports[0];
  const sportBorderClass = `border-sport-${room.sportType || 'basketball'}`;

  // Format date if available
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card
      className={`card-hover p-4 cursor-pointer ${sportBorderClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onClick(room)}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{sport.emoji}</span>
        <Badge variant="secondary" className="text-xs uppercase">
          {sport.label}
        </Badge>
      </div>
      <h4 className="font-semibold mb-1 truncate">
        {room.roomName || room.roomCode}
      </h4>
      {room.teams && (
        <p className="text-sm text-muted-foreground mb-2 truncate">{room.teams}</p>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {room.gameDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(room.gameDate)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {room.participantCount || 0}
          </span>
        </div>
        <ArrowRight className="h-4 w-4" />
      </div>
    </Card>
  );
}

/**
 * HomePage Component
 *
 * Landing page with hero section, feature cards, and room management.
 */
function HomePage({ onJoin }) {
  const { profile, session, fetchRecentRooms } = useAuthStore();
  const {
    isConnected,
    error,
    clearError,
    roomId,
    sportType: currentRoomSportType,
    setViewingHome,
  } = useChatStore();

  // Check if user is viewing home while still in a room
  const isInRoom = !!roomId;
  const currentRoomSport = isInRoom ? getSportConfig(currentRoomSportType) : null;

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
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

  // Handle room creation from modal
  const handleCreateRoom = (roomData) => {
    clearError();
    // For now, pass just the essential data that the backend expects
    // The new metadata fields will be added once the backend is updated
    onJoin(
      roomData.roomCode,
      roomData.nickname,
      roomData.sportType,
      {
        roomName: roomData.roomName,
        teams: roomData.teams,
        gameDate: roomData.gameDate,
      }
    );
    setShowCreateModal(false);
  };

  // Handle joining with code
  const handleJoinWithCode = (e) => {
    e.preventDefault();
    clearError();

    const trimmedNickname = nickname.trim();
    const trimmedCode = joinCode.trim().toUpperCase();

    if (!trimmedNickname || !trimmedCode) return;

    onJoin(trimmedCode, trimmedNickname, DEFAULT_SPORT);
  };

  // Quick join from recent room
  const handleQuickJoin = (room) => {
    clearError();
    onJoin(room.roomCode, room.nickname, room.sportType || DEFAULT_SPORT);
  };

  return (
    <div className="min-h-screen">
      {/* Header with Auth */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-lg">SpoilerFreeChat</h1>
          <AuthButton />
        </div>
      </header>

      {/* Return to Room Notice */}
      {isInRoom && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>{currentRoomSport?.emoji}</span>
                You're still in room: <strong>{roomId}</strong>
              </span>
              <Button size="sm" onClick={() => setViewingHome(false)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Return to Room
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-gradient py-16 md:py-24 text-center px-4">
        <Badge variant="secondary" className="mb-6">
          <Shield className="h-3 w-3 mr-1" />
          Anti-spoiler protected
        </Badge>

        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          Watch Together,{' '}
          <span className="text-gradient-green">Stay Safe</span>
        </h2>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Chat about live games without spoilers. Messages are delayed based on
          your game clock position.
        </p>

        <Button size="lg" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Create Game Room
        </Button>
      </section>

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-4 -mt-8 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={Clock}
            title="Time-Synced"
            description="Messages appear when you reach that game moment"
            color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          />
          <FeatureCard
            icon={Users}
            title="Group Chat"
            description="Create rooms for any game with friends"
            color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
          />
          <FeatureCard
            icon={Zap}
            title="Real-Time"
            description="Instant messaging with smart delay logic"
            color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          />
        </div>
      </section>

      {/* Recent Rooms + Join by Code */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-semibold">
            {recentRooms.length > 0 ? 'Recent Rooms' : 'Join a Room'}
          </h3>

          {/* Join by Code Form */}
          <form onSubmit={handleJoinWithCode} className="flex gap-2">
            <Input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname"
              maxLength={30}
              className="w-28"
              required
            />
            <Input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={20}
              className="w-32 font-mono uppercase"
              required
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!isConnected || !nickname.trim() || !joinCode.trim()}
            >
              Join
            </Button>
          </form>
        </div>

        {/* Recent Rooms Grid */}
        {recentRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentRooms.slice(0, 6).map((room) => (
              <RoomCard
                key={room.roomCode}
                room={room}
                onClick={handleQuickJoin}
                disabled={!isConnected}
              />
            ))}
          </div>
        ) : session ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No recent rooms yet. Create or join a room to get started!
            </p>
            <Button variant="outline" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Room
            </Button>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-2">
              Sign in to see your recent rooms and save your preferences.
            </p>
            <p className="text-sm text-muted-foreground">
              You can still create and join rooms as a guest using the form above.
            </p>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        <div className="flex justify-center mt-8">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected to server' : 'Connecting to server...'}
          </Badge>
        </div>
      </section>

      {/* Create Room Modal */}
      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateRoom={handleCreateRoom}
        defaultNickname={profile?.preferredNickname || nickname}
        error={error}
        isConnected={isConnected}
      />
    </div>
  );
}

export default HomePage;
