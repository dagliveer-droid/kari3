import { useEffect, useState } from "react";
import { socket } from "./socket";
import Lobby from "./screens/Lobby";
import Waiting from "./screens/Waiting";
import Game from "./screens/Game";

const SESSION_KEY = "kaari3-session";

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export default function App() {
  const [initialSession] = useState(() => loadSession());
  const [screen, setScreen] = useState("lobby");
  const [myId, setMyId] = useState(initialSession?.playerId || null);
  const [myName, setMyName] = useState(initialSession?.name || "");
  const [roomCode, setRoomCode] = useState(initialSession?.roomCode || "");
  const [gameState, setGameState] = useState({});
  const [myHand, setMyHand] = useState([]);

  useEffect(() => {
    if (initialSession) {
      socket.connect();
    }

    const handleConnect = () => {
      const session = loadSession();
      if (session?.roomCode && session?.playerId) {
        socket.emit("reconnect_room", session);
      }
    };

    const handleJoined = ({ roomCode: joinedRoomCode, playerId }) => {
      const session = {
        roomCode: joinedRoomCode,
        playerId,
        name: myName,
      };
      saveSession(session);
      setMyId(playerId);
      setRoomCode(joinedRoomCode);
      setScreen("waiting");
    };

    const handleReconnected = ({ roomCode: joinedRoomCode, playerId }) => {
      const session = loadSession();
      if (session) {
        saveSession({ ...session, roomCode: joinedRoomCode, playerId });
        setMyName(session.name || "");
      }
      setMyId(playerId);
      setRoomCode(joinedRoomCode);
    };

    const handleRoomState = state => {
      setGameState(state);
      setScreen(prev => {
        if (state.phase === "waiting") return "waiting";
        if (state.phase && prev !== "game") return "game";
        return prev;
      });
    };

    const handleHand = hand => {
      setMyHand(hand);
    };

    const handleError = data => {
      alert(data.message);
    };

    const handleReconnectFailed = () => {
      clearSession();
      setScreen("lobby");
      setRoomCode("");
      setMyId(null);
      setGameState({});
      setMyHand([]);
      alert("Your previous room session could not be restored.");
    };

    socket.on("connect", handleConnect);
    socket.on("room_created", handleJoined);
    socket.on("joined_room", handleJoined);
    socket.on("reconnected_room", handleReconnected);
    socket.on("room_state", handleRoomState);
    socket.on("your_hand", handleHand);
    socket.on("game_error", handleError);
    socket.on("reconnect_failed", handleReconnectFailed);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room_created", handleJoined);
      socket.off("joined_room", handleJoined);
      socket.off("reconnected_room", handleReconnected);
      socket.off("room_state", handleRoomState);
      socket.off("your_hand", handleHand);
      socket.off("game_error", handleError);
      socket.off("reconnect_failed", handleReconnectFailed);
    };
  }, [initialSession, myName]);

  const effectiveName =
    gameState.players?.find(player => player.id === myId)?.name || myName;

  if (screen === "lobby") {
    return <Lobby onNameChange={setMyName} />;
  }

  if (screen === "waiting") {
    return (
      <Waiting
        roomCode={roomCode}
        players={gameState.players || []}
        myId={myId}
        hostId={gameState.hostId}
      />
    );
  }

  return (
    <Game
      roomCode={roomCode}
      myId={myId}
      myName={effectiveName}
      state={gameState}
      myHand={myHand}
    />
  );
}
