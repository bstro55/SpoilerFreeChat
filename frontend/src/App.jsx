import useChatStore from './store/chatStore';
import useSocket from './hooks/useSocket';
import JoinRoom from './components/JoinRoom';
import ChatRoom from './components/ChatRoom';
import './App.css';

/**
 * Main App Component
 *
 * Handles the top-level routing between the join screen and chat room.
 * Initializes the socket connection via the useSocket hook.
 */
function App() {
  // Initialize socket connection and get helper functions
  const { joinRoom, sendMessage, leaveRoom } = useSocket();

  // Get room state to determine which view to show
  const { roomId } = useChatStore();

  // If user is in a room, show the chat room
  // Otherwise, show the join room screen
  return (
    <div className="app">
      {roomId ? (
        <ChatRoom onSendMessage={sendMessage} onLeaveRoom={leaveRoom} />
      ) : (
        <JoinRoom onJoin={joinRoom} />
      )}
    </div>
  );
}

export default App;
