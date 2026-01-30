import useChatStore from './store/chatStore';
import useSocket from './hooks/useSocket';
import JoinRoom from './components/JoinRoom';
import ChatRoom from './components/ChatRoom';

/**
 * Main App Component
 *
 * Handles the top-level routing between the join screen and chat room.
 * Initializes the socket connection via the useSocket hook.
 */
function App() {
  const { joinRoom, sendMessage, leaveRoom, syncGameTime } = useSocket();
  const { roomId } = useChatStore();

  return roomId ? (
    <ChatRoom
      onSendMessage={sendMessage}
      onLeaveRoom={leaveRoom}
      onSyncGameTime={syncGameTime}
    />
  ) : (
    <JoinRoom onJoin={joinRoom} />
  );
}

export default App;
