import { useEffect, useState } from "react";
import { socket } from "./socket";
import Lobby from "./screens/Lobby";
import Waiting from "./screens/Waiting";
import Game from "./screens/Game";

const SESSION_KEY = "kaari3-session";
const ACTIVE_SESSION_KEY = "kaari3-active-session";

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

function hasActiveSessionMarker() {
  try {
    return sessionStorage.getItem(ACTIVE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markSessionActive() {
  try {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, "1");
  } catch {
    // Ignore storage errors and continue without auto-resume support.
  }
}

function clearSessionActive() {
  try {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // Ignore storage errors and continue without auto-resume support.
  }
}

function getRoomCodeFromPath() {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname.substring(1);
  if (/^[A-Za-z0-9]{5}$/.test(path)) {
    return path.toUpperCase();
  }
  return "";
}

export default function App() {
  const [savedSession, setSavedSession] = useState(() => loadSession());
  const [shouldAutoReconnect] = useState(() => hasActiveSessionMarker());
  const [screen, setScreen] = useState("lobby");
  const [myId, setMyId] = useState(savedSession?.playerId || null);
  const [myName, setMyName] = useState(savedSession?.name || "");
  const [initialRoomCode] = useState(() => getRoomCodeFromPath());
  const [roomCode, setRoomCode] = useState(() => {
    const codeFromPath = getRoomCodeFromPath();
    if (codeFromPath) return codeFromPath;
    return savedSession?.roomCode || "";
  });
  const [gameState, setGameState] = useState({});
  const [myHand, setMyHand] = useState([]);

  useEffect(() => {
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
      setSavedSession(session);
      markSessionActive();
      setMyId(playerId);
      setRoomCode(joinedRoomCode);
      setScreen("waiting");
    };

    const handleReconnected = ({ roomCode: joinedRoomCode, playerId }) => {
      const session = loadSession();
      if (session) {
        const nextSession = { ...session, roomCode: joinedRoomCode, playerId };
        saveSession(nextSession);
        setSavedSession(nextSession);
        setMyName(nextSession.name || "");
      }
      markSessionActive();
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
      clearSessionActive();
      setSavedSession(null);
      setScreen("lobby");
      setRoomCode("");
      setMyId(null);
      setMyName("");
      setGameState({});
      setMyHand([]);
    };

    const handleKicked = () => {
      clearSession();
      clearSessionActive();
      setSavedSession(null);
      setScreen("lobby");
      setRoomCode("");
      setMyId(null);
      setMyName("");
      setGameState({});
      setMyHand([]);
      alert("You have been kicked from the room.");
    };

    socket.on("connect", handleConnect);
    socket.on("room_created", handleJoined);
    socket.on("joined_room", handleJoined);
    socket.on("reconnected_room", handleReconnected);
    socket.on("room_state", handleRoomState);
    socket.on("your_hand", handleHand);
    socket.on("game_error", handleError);
    socket.on("reconnect_failed", handleReconnectFailed);
    socket.on("kicked", handleKicked);

    if (savedSession && shouldAutoReconnect) {
      if (socket.connected) {
        handleConnect();
      } else {
        socket.connect();
      }
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room_created", handleJoined);
      socket.off("joined_room", handleJoined);
      socket.off("reconnected_room", handleReconnected);
      socket.off("room_state", handleRoomState);
      socket.off("your_hand", handleHand);
      socket.off("game_error", handleError);
      socket.off("reconnect_failed", handleReconnectFailed);
      socket.off("kicked", handleKicked);
    };
  }, [savedSession, myName, shouldAutoReconnect]);

  function resumeSavedRoom() {
    if (!savedSession?.roomCode || !savedSession?.playerId) return;
    setMyId(savedSession.playerId);
    setMyName(savedSession.name || "");
    setRoomCode(savedSession.roomCode);
    markSessionActive();
    if (socket.connected) {
      socket.emit("reconnect_room", savedSession);
    } else {
      socket.connect();
    }
  }

  function leaveRoom() {
    socket.disconnect();
    clearSession();
    clearSessionActive();
    setSavedSession(null);
    setScreen("lobby");
    setRoomCode("");
    setMyId(null);
    setMyName("");
    setGameState({});
    setMyHand([]);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
    socket.connect();
  }

  const effectiveName =
    gameState.players?.find(player => player.id === myId)?.name || myName;

  if (screen === "lobby") {
    return (
      <Lobby
        onNameChange={setMyName}
        savedSession={savedSession}
        onResumeSavedRoom={resumeSavedRoom}
        initialRoomCode={initialRoomCode}
      />
    );
  }

  if (screen === "waiting") {
    return (
      <Waiting
        roomCode={roomCode}
        players={gameState.players || []}
        myId={myId}
        hostId={gameState.hostId}
        onLeaveRoom={leaveRoom}
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
      onLeaveRoom={leaveRoom}
    />
  );
}
