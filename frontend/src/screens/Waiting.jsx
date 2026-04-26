import { socket } from "../socket";
import { initAudio, playUiSound } from "../audio";

export default function Waiting({ roomCode, players, myId, hostId }) {
  const isHost = myId && hostId === myId;

  function startGame() {
    initAudio();
    playUiSound("start");
    socket.emit("start_game", { roomCode });
  }

  return (
    <div
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
          width: "min(880px, 100%)",
          display: "grid",
          gap: "1.2rem",
        }}
      >
        <div
          className="soft-panel paper-grain"
          style={{
            borderRadius: "30px",
            padding: "2rem",
            display: "grid",
            gap: "1.2rem",
            textAlign: "center",
            background: "linear-gradient(180deg, rgba(255,252,247,0.94), rgba(248,241,234,0.86))",
          }}
        >
          <div style={{ fontFamily: '"Fraunces", serif', fontSize: "2.5rem", color: "var(--text)" }}>Kaari 3</div>
          <div style={{ color: "var(--muted)", fontSize: "1rem" }}>Share this room code with your table</div>

          <div
            style={{
              justifySelf: "center",
              padding: "1rem 1.6rem",
              borderRadius: "24px",
              background: "rgba(255,255,255,0.62)",
              border: "1px solid rgba(117,96,84,0.12)",
              boxShadow: "0 16px 32px rgba(123,98,85,0.08)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
              Room Code
            </div>
            <div style={{ marginTop: "0.4rem", fontFamily: '"Fraunces", serif', fontSize: "3rem", letterSpacing: "0.22em", color: "var(--accent)" }}>
              {roomCode}
            </div>
          </div>

          <div style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            {players.length}/11 players · Need at least 5 to start
          </div>
        </div>

        <div
          className="soft-panel"
          style={{
            borderRadius: "30px",
            padding: "1.3rem",
            display: "grid",
            gap: "0.8rem",
            background: "rgba(255,252,247,0.84)",
          }}
        >
          {players.map(player => (
            <div
              key={player.id}
              className="fade-up"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "1rem 1.1rem",
                borderRadius: "22px",
                background: player.id === myId ? "rgba(219,143,122,0.12)" : "rgba(255,255,255,0.58)",
                border: "1px solid rgba(117,96,84,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: player.connected === false ? "var(--red)" : "var(--green)",
                    boxShadow: player.connected === false
                      ? "0 0 0 6px rgba(216,139,139,0.12)"
                      : "0 0 0 6px rgba(143,174,146,0.12)",
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text)" }}>{player.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                    {player.id === myId ? "You" : "At the table"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {player.id === hostId && <div className="status-pill" style={{ background: "rgba(210,180,125,0.18)", color: "#9a7a42" }}>Host</div>}
                {player.connected === false && <div className="status-pill" style={{ background: "rgba(216,139,139,0.14)", color: "#af6666" }}>Offline</div>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          {isHost ? (
            <button
              className="soft-button"
              onClick={startGame}
              disabled={players.length < 5}
              style={{
                minWidth: "220px",
                background: players.length < 5 ? "rgba(138,118,107,0.18)" : "linear-gradient(135deg, #e6a590, #d88f7a)",
                color: players.length < 5 ? "var(--muted)" : "white",
                opacity: players.length < 5 ? 0.7 : 1,
                cursor: players.length < 5 ? "not-allowed" : "pointer",
              }}
            >
              Start Game
            </button>
          ) : (
            <div
              className="soft-panel"
              style={{
                borderRadius: "999px",
                padding: "0.9rem 1.2rem",
                background: "rgba(255,252,247,0.76)",
                color: "var(--muted)",
              }}
            >
              Waiting for the host to start the game
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
