export default function GameOverOverlay({ result }) {
  function playAgain() {
    localStorage.removeItem("kaari3-session");
    window.location.reload();
  }

  return (
    <div style={overlay}>
      <div
        className="soft-panel fade-up"
        style={{
          width: "min(520px, 94vw)",
          borderRadius: "32px",
          padding: "2rem",
          display: "grid",
          gap: "1rem",
          background: "rgba(255,251,247,0.96)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "grid", gap: "0.35rem" }}>
          <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: "2rem", color: result.bidWon ? "#7b9a7e" : "#b87474" }}>
            {result.bidWon ? "Bid Team Wins" : "Bid Team Falls Short"}
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.65 }}>{result.message}</p>
        </div>

        <div style={{ display: "grid", gap: "0.65rem" }}>
          {[
            { label: "Bid Amount", value: result.bidAmount, color: "var(--accent)" },
            { label: "Bid Team Score", value: result.bidTeamScore, color: "#7b9a7e" },
            { label: "Opp Team Score", value: result.oppTeamScore, color: "#b87474" },
            { label: "Bid Team", value: result.bidTeam.join(", "), color: "var(--text)" },
            { label: "Opp Team", value: result.oppTeam.join(", "), color: "var(--text)" },
          ].map(row => (
            <div
              key={row.label}
              className="soft-panel"
              style={{
                borderRadius: "18px",
                padding: "0.8rem 0.95rem",
                background: "rgba(255,255,255,0.72)",
                display: "flex",
                justifyContent: "space-between",
                gap: "0.8rem",
                textAlign: "left",
              }}
            >
              <span style={{ color: "var(--muted)" }}>{row.label}</span>
              <span style={{ color: row.color, fontWeight: 700 }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            className="soft-button"
            onClick={playAgain}
            style={{
              background: "linear-gradient(135deg, #e6a590, #d88f7a)",
              color: "white",
              minWidth: "200px",
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(242,233,223,0.64)",
  backdropFilter: "blur(12px)",
  display: "grid",
  placeItems: "center",
  zIndex: 200,
  padding: "1rem",
};
