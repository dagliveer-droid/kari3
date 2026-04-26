import { useState } from "react";
import { socket } from "../socket";
import { initAudio, playUiSound } from "../audio";

export default function Lobby({ onNameChange }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleNameChange(value) {
    setName(value);
    onNameChange?.(value);
  }

  function createRoom() {
    if (!name.trim()) {
      setError("Enter your name first");
      return;
    }

    initAudio();
    playUiSound("join");
    setError("");
    socket.connect();
    socket.emit("create_room", { name: name.trim() });
  }

  function joinRoom() {
    if (!name.trim()) {
      setError("Enter your name first");
      return;
    }
    if (!code.trim()) {
      setError("Enter a room code");
      return;
    }

    initAudio();
    playUiSound("join");
    setError("");
    socket.connect();
    socket.emit("join_room", { roomCode: code.trim().toUpperCase(), name: name.trim() });
  }

  return (
    <div
      className="soft-shell"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <div
        className="fade-up"
        style={{
          width: "min(1020px, 100%)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.4rem",
          alignItems: "stretch",
        }}
      >
        <div
          className="soft-panel paper-grain"
          style={{
            borderRadius: "34px",
            padding: "clamp(2rem, 5vw, 4rem)",
            minHeight: "min(74vh, 760px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background:
              "linear-gradient(145deg, rgba(255,252,247,0.9), rgba(247,239,231,0.84))",
          }}
        >
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.55rem",
                alignSelf: "flex-start",
                padding: "0.45rem 0.8rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(117,96,84,0.1)",
                color: "var(--muted)",
                fontSize: "0.76rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Table Ready
            </div>

            <div style={{ display: "grid", gap: "0.85rem" }}>
              <h1
                style={{
                  fontFamily: '"Fraunces", serif',
                  fontSize: "clamp(3rem, 8vw, 6rem)",
                  lineHeight: 0.92,
                  fontWeight: 700,
                  color: "var(--text)",
                  letterSpacing: "-0.04em",
                }}
              >
                Kaari 3
              </h1>
              <p
                style={{
                  maxWidth: "34rem",
                  fontSize: "1.03rem",
                  lineHeight: 1.75,
                  color: "var(--muted)",
                }}
              >
                A softer card table for a sharp game. Create a room, bring your group in, and let the bidding,
                hidden partners, and tricks do the talking.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "0.9rem",
            }}
          >
            {[
              { label: "Players", value: "5-11" },
              { label: "Modes", value: "1-2 Decks" },
              { label: "Style", value: "Live Room" },
            ].map(item => (
              <div
                key={item.label}
                className="soft-panel"
                style={{
                  borderRadius: "24px",
                  padding: "1rem 1.1rem",
                  background: "rgba(255,255,255,0.5)",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {item.label}
                </div>
                <div style={{ marginTop: "0.45rem", fontFamily: '"Fraunces", serif', fontSize: "1.15rem", color: "var(--text)" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="soft-panel fade-up"
          style={{
            borderRadius: "34px",
            padding: "2rem",
            background: "linear-gradient(180deg, rgba(255,252,247,0.96), rgba(250,245,240,0.92))",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
              Enter Table
            </div>
            <div style={{ fontFamily: '"Fraunces", serif', fontSize: "2rem", color: "var(--text)" }}>
              Start with your name
            </div>
          </div>

          <input
            style={input}
            placeholder="Your name"
            maxLength={16}
            value={name}
            onChange={event => handleNameChange(event.target.value)}
            onKeyDown={event => event.key === "Enter" && createRoom()}
          />

          {error && (
            <div
              style={{
                color: "#b36d6d",
                background: "rgba(216,139,139,0.12)",
                border: "1px solid rgba(216,139,139,0.2)",
                borderRadius: "18px",
                padding: "0.8rem 0.95rem",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            className="soft-button"
            style={{
              background: "linear-gradient(135deg, #e6a590, #d88f7a)",
              color: "white",
            }}
            onClick={createRoom}
          >
            Create Room
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "var(--muted)", fontSize: "0.82rem" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(117,96,84,0.15)" }} />
            <span>or join an existing table</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(117,96,84,0.15)" }} />
          </div>

          <input
            style={{ ...input, textTransform: "uppercase" }}
            placeholder="Room code"
            maxLength={5}
            value={code}
            onChange={event => setCode(event.target.value.toUpperCase())}
            onKeyDown={event => event.key === "Enter" && joinRoom()}
          />

          <button
            className="soft-button"
            style={{
              background: "rgba(255,255,255,0.72)",
              color: "var(--text)",
              borderColor: "rgba(117,96,84,0.14)",
            }}
            onClick={joinRoom}
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}

const input = {
  width: "100%",
  borderRadius: "20px",
  border: "1px solid rgba(117,96,84,0.12)",
  background: "rgba(255,255,255,0.75)",
  padding: "1rem 1.1rem",
  outline: "none",
  fontSize: "1rem",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
};
