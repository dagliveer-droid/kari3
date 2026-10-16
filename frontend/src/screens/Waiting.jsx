import { socket } from "../socket";
import { initAudio, playUiSound } from "../audio";

export default function Waiting({ roomCode, players, myId, hostId, onLeaveRoom, onOpenRules, onShowBanner }) {
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
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
              Room Code
            </div>
            <div style={{ marginTop: "0.4rem", fontFamily: '"Fraunces", serif', fontSize: "3rem", letterSpacing: "0.22em", color: "var(--accent)" }}>
              {roomCode}
            </div>
            <button
              className="soft-button"
              style={{
                marginTop: "0.8rem",
                padding: "0.45rem 0.95rem",
                fontSize: "0.78rem",
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(117,96,84,0.14)",
                color: "var(--text)",
                borderRadius: "999px",
                cursor: "pointer",
                fontWeight: 700
              }}
              onClick={() => {
                const link = `${window.location.origin}/${roomCode}`;
                navigator.clipboard.writeText(link).then(() => {
                  if (onShowBanner) onShowBanner("Invite link copied to clipboard!");
                }).catch(() => {
                  if (onShowBanner) onShowBanner(`Invite link: ${link}`);
                });
              }}
            >
              🔗 Copy Invite Link
            </button>
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

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                {player.id === hostId ? (
                  <div className="status-pill" style={{ background: "rgba(210,180,125,0.18)", color: "#9a7a42" }}>Host</div>
                ) : (
                  <>
                    {player.connected === false && (
                      <div className="status-pill" style={{ background: "rgba(216,139,139,0.14)", color: "#af6666" }}>
                        Offline
                      </div>
                    )}
                    {isHost && (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          className="soft-button"
                          onClick={() => {
                            if (window.confirm(`Transfer host rights to ${player.name}?`)) {
                              socket.emit("transfer_host", { roomCode, targetPlayerId: player.id });
                            }
                          }}
                          style={{
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.74rem",
                            borderRadius: "10px",
                            background: "rgba(210,180,125,0.12)",
                            border: "1px solid rgba(210,180,125,0.22)",
                            color: "#836531",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          👑 Make Host
                        </button>
                        <button
                          className="soft-button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to kick ${player.name}?`)) {
                              socket.emit("kick_player", { roomCode, targetPlayerId: player.id });
                            }
                          }}
                          style={{
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.74rem",
                            borderRadius: "10px",
                            background: "rgba(216,139,139,0.1)",
                            border: "1px solid rgba(216,139,139,0.2)",
                            color: "#af6666",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          ❌ Kick
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
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
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="soft-button"
              onClick={onOpenRules}
              style={{
                padding: "0.55rem 1.2rem",
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(117,96,84,0.18)",
                color: "var(--text)",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              📖 Game Rules
            </button>
            <button
              className="soft-button"
              onClick={onLeaveRoom}
              style={{
                padding: "0.55rem 1.2rem",
                background: "rgba(216,139,139,0.12)",
                border: "1px solid rgba(216,139,139,0.2)",
                color: "#af6666",
                fontSize: "0.88rem"
              }}
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
