import { socket } from "../../socket";
import { initAudio, playUiSound } from "../../audio";

const OPTIONS = [
  { key: "SPADES", label: "Spades", icon: "♠", tone: "#63708f", bg: "rgba(99,112,143,0.14)" },
  { key: "HEARTS", label: "Hearts", icon: "♥", tone: "#d78686", bg: "rgba(215,134,134,0.14)" },
  { key: "CLUBS", label: "Clubs", icon: "♣", tone: "#7f9d82", bg: "rgba(127,157,130,0.14)" },
  { key: "DIAMONDS", label: "Diamonds", icon: "♦", tone: "#d0a066", bg: "rgba(208,160,102,0.14)" },
  { key: "NONE", label: "No Trump", icon: "•", tone: "#8a766b", bg: "rgba(138,118,107,0.12)", full: true },
];

export default function TrumpOverlay({ roomCode }) {
  function chooseTrump(trump) {
    initAudio();
    playUiSound("trump");
    socket.emit("choose_trump", { roomCode, trump });
  }

  return (
    <div style={overlay}>
      <div
        className="soft-panel fade-up"
        style={{
          borderRadius: "30px",
          padding: "2rem",
          width: "min(520px, 94vw)",
          display: "grid",
          gap: "1rem",
          background: "rgba(255,251,247,0.95)",
        }}
      >
        <div style={{ textAlign: "center", display: "grid", gap: "0.4rem" }}>
          <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: "2rem", color: "var(--text)" }}>Choose Trump</h2>
          <p style={{ color: "var(--muted)" }}>You won the bid. Pick the suit that shapes this round.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
          {OPTIONS.map(option => (
            <button
              key={option.key}
              className="soft-button"
              onClick={() => chooseTrump(option.key)}
              style={{
                background: option.bg,
                color: option.tone,
                borderColor: "rgba(117,96,84,0.08)",
                minHeight: "112px",
                display: "grid",
                placeItems: "center",
                gap: "0.2rem",
                gridColumn: option.full ? "1 / -1" : "auto",
              }}
            >
              <span style={{ fontSize: "2rem", lineHeight: 1 }}>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(242,233,223,0.56)",
  backdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  zIndex: 100,
  padding: "1rem",
};
