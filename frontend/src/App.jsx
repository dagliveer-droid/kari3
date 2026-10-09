import { useEffect, useState, useRef } from "react";
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

function getRoomCodeFromPath() {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname.substring(1);
  if (/^[A-Za-z0-9]{5}$/.test(path)) {
    return path.toUpperCase();
  }
  return "";
}

export default function App() {
  const [savedSession, setSavedSession] = useState(() => {
    const session = loadSession();
    const pathCode = getRoomCodeFromPath();

    if (pathCode && session && session.roomCode !== pathCode) {
      clearSession();
      return null;
    }
    return session;
  });
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
  const [connectionTrouble, setConnectionTrouble] = useState(false);

  const myNameRef = useRef(myName);
  useEffect(() => {
    myNameRef.current = myName;
  }, [myName]);

  useEffect(() => {
    const handleConnect = () => {
      const session = loadSession();
      if (session?.roomCode && session?.playerId && session?.token) {
        socket.emit("reconnect_room", session);
      }
    };

    const handleJoined = ({ roomCode: joinedRoomCode, playerId, token }) => {
      const session = {
        roomCode: joinedRoomCode,
        playerId,
        token,
        name: myNameRef.current,
      };
      saveSession(session);
      setSavedSession(session);
      setMyId(playerId);
      setRoomCode(joinedRoomCode);
      setScreen("waiting");
      setConnectionTrouble(false);

      if (typeof window !== "undefined") {
        const newUrl = `${window.location.origin}/${joinedRoomCode}`;
        window.history.replaceState(null, "", newUrl);
      }
    };

    const handleReconnected = ({ roomCode: joinedRoomCode, playerId }) => {
      const session = loadSession();
      const nextSession = session
        ? { ...session, roomCode: joinedRoomCode, playerId }
        : { roomCode: joinedRoomCode, playerId, name: myNameRef.current };
      saveSession(nextSession);
      setSavedSession(nextSession);
      setMyName(nextSession.name || "");
      setMyId(playerId);
      setRoomCode(joinedRoomCode);
      setConnectionTrouble(false);

      if (typeof window !== "undefined") {
        const newUrl = `${window.location.origin}/${joinedRoomCode}`;
        window.history.replaceState(null, "", newUrl);
      }
    };

    const handleRoomState = state => {
      setGameState(state);
      setConnectionTrouble(false);
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
      setSavedSession(null);
      setScreen("lobby");
      setRoomCode("");
      setMyId(null);
      setMyName("");
      setGameState({});
      setMyHand([]);
      setConnectionTrouble(false);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
    };

    const handleKicked = () => {
      clearSession();
      setSavedSession(null);
      setScreen("lobby");
      setRoomCode("");
      setMyId(null);
      setMyName("");
      setGameState({});
      setMyHand([]);
      setConnectionTrouble(false);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
      alert("You have been kicked from the room.");
    };

    const handleSessionReplaced = () => {
      clearSession();
      setSavedSession(null);
      setScreen("lobby");
      setRoomCode("");
      setMyId(null);
      setMyName("");
      setGameState({});
      setMyHand([]);
      setConnectionTrouble(false);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
      alert("You have been disconnected because the room was joined from another tab or window.");
    };

    socket.on("connect", handleConnect);
    socket.on("room_created", handleJoined);
    socket.on("joined_room", handleJoined);
    const handleReconnectTempUnavailable = () => {
      setConnectionTrouble(true);
      setTimeout(() => {
        const session = loadSession();
        if (session) {
          socket.emit("reconnect_room", session);
        }
      }, 2000);
    };

    socket.on("reconnected_room", handleReconnected);
    socket.on("room_state", handleRoomState);
    socket.on("your_hand", handleHand);
    socket.on("game_error", handleError);
    socket.on("reconnect_failed", handleReconnectFailed);
    socket.on("kicked", handleKicked);
    socket.on("session_replaced", handleSessionReplaced);
    socket.on("reconnect_temporarily_unavailable", handleReconnectTempUnavailable);

    const initialSession = loadSession();
    if (initialSession) {
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
      socket.off("session_replaced", handleSessionReplaced);
      socket.off("reconnect_temporarily_unavailable", handleReconnectTempUnavailable);
    };
  }, []);

  function resumeSavedRoom() {
    if (!savedSession?.roomCode || !savedSession?.playerId || !savedSession?.token) return;
    setMyId(savedSession.playerId);
    setMyName(savedSession.name || "");
    setRoomCode(savedSession.roomCode);
    if (socket.connected) {
      socket.emit("reconnect_room", savedSession);
    } else {
      socket.connect();
    }
  }

  function leaveRoom() {
    if (socket.connected) {
      socket.emit("leave_room");
    }
    clearSession();
    setSavedSession(null);
    setScreen("lobby");
    setRoomCode("");
    setMyId(null);
    setMyName("");
    setGameState({});
    setMyHand([]);
    setConnectionTrouble(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
    // Small delay so the server processes the leave before we reconnect
    setTimeout(() => {
      socket.disconnect();
      socket.connect();
    }, 100);
  }

  function handleClearSession() {
    clearSession();
    setSavedSession(null);
  }

  const effectiveName =
    gameState.players?.find(player => player.id === myId)?.name || myName;

  let screenComponent;
  if (screen === "lobby") {
    screenComponent = (
      <Lobby
        onNameChange={setMyName}
        savedSession={savedSession}
        onResumeSavedRoom={resumeSavedRoom}
        onClearSession={handleClearSession}
        initialRoomCode={initialRoomCode}
      />
    );
  } else if (screen === "waiting") {
    screenComponent = (
      <Waiting
        roomCode={roomCode}
        players={gameState.players || []}
        myId={myId}
        hostId={gameState.hostId}
        onLeaveRoom={leaveRoom}
      />
    );
  } else {
    screenComponent = (
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

  return (
    <>
      {screenComponent}
      {connectionTrouble && (
        <div
          className="soft-panel fade-up"
          style={{
            position: "fixed",
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "rgba(216,139,139,0.95)",
            borderColor: "rgba(216,139,139,0.3)",
            color: "#fff",
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            fontSize: "0.85rem",
            fontWeight: 700,
            boxShadow: "0 10px 30px rgba(216,139,139,0.3)",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#fff", animation: "pulse 1.2s infinite ease-in-out" }} />
          Connection trouble — retrying...
        </div>
      )}
    </>
  );
}
