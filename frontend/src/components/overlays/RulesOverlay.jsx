import { useEffect } from "react";

export default function RulesOverlay({ onClose }) {
  // Allow closing with Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="soft-panel fade-up"
        style={{
          width: "min(680px, 94vw)",
          maxHeight: "88vh",
          borderRadius: "32px",
          padding: "clamp(1.2rem, 3vw, 2rem)",
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
          background: "rgba(255, 252, 247, 0.98)",
          boxShadow: "0 24px 60px rgba(84, 68, 60, 0.24)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--line)",
            paddingBottom: "0.8rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 700,
              }}
            >
              How to Play
            </div>
            <h2
              style={{
                fontFamily: '"Fraunces", serif',
                fontSize: "1.8rem",
                color: "var(--text)",
                marginTop: "0.2rem",
              }}
            >
              📖 Kaari 3 Rules
            </h2>
          </div>
          <button
            className="soft-button"
            onClick={onClose}
            aria-label="Close rules"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "rgba(138, 118, 107, 0.12)",
              border: "1px solid rgba(117, 96, 84, 0.15)",
              color: "var(--text)",
              fontSize: "1.1rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content sections */}
        <div style={{ display: "grid", gap: "1rem", fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text)" }}>
          {/* Section 1: Objective */}
          <div style={cardSectionStyle}>
            <div style={sectionTitleStyle}>🎯 Objective & Overview</div>
            <p style={{ color: "var(--muted)" }}>
              Kaari 3 is a strategic trick-taking card game for <strong>5 to 11 players</strong>.
              Players compete in an auction to win the bid. The highest bidder chooses the <strong>Trump Suit</strong> and names <strong>Secret Partners</strong>.
              The Bidder’s Team aims to capture enough points to fulfill their bid, while the Defending Team attempts to stop them.
            </p>
          </div>

          {/* Section 2: Card Points */}
          <div style={cardSectionStyle}>
            <div style={sectionTitleStyle}>💎 Card Points & Scoring</div>
            <p style={{ color: "var(--muted)", marginBottom: "0.8rem" }}>
              Only specific cards carry points. All other cards carry zero points:
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.6rem",
              }}
            >
              <div style={pointBadgeStyle("#d88f7a", "rgba(219, 143, 122, 0.12)")}>
                <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>♠ 3</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Kaari Teedi</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.2rem" }}>30 Points</div>
              </div>

              <div style={pointBadgeStyle("#8fae92", "rgba(143, 174, 146, 0.14)")}>
                <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>10, J, Q, K, A</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>All suits</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.2rem" }}>10 Points each</div>
              </div>

              <div style={pointBadgeStyle("#d2b47d", "rgba(210, 180, 125, 0.14)")}>
                <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>5</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>All suits</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.2rem" }}>5 Points each</div>
              </div>

              <div style={pointBadgeStyle("var(--muted)", "rgba(138, 118, 107, 0.08)")}>
                <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>2, 4, 6, 7, 8, 9</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Except ♠3</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.2rem" }}>0 Points</div>
              </div>
            </div>

            <div style={{ marginTop: "0.75rem", fontSize: "0.84rem", color: "var(--muted)" }}>
              • <strong>5–7 Players:</strong> 1 Deck (250 total points in play, min bid: 125)<br />
              • <strong>8–11 Players:</strong> 2 Decks (500 total points in play, min bid: 250)
            </div>
          </div>

          {/* Section 3: Bidding & Trump */}
          <div style={cardSectionStyle}>
            <div style={sectionTitleStyle}>🗣️ Bidding & Choosing Trump</div>
            <ul style={{ paddingLeft: "1.2rem", color: "var(--muted)", display: "grid", gap: "0.4rem" }}>
              <li>Bidding starts from the minimum bid and advances in <strong>increments of 5</strong>.</li>
              <li>You may raise the highest bid or click <strong>Pass</strong>. Once you pass, you cannot bid again in this round.</li>
              <li>The highest bidder wins the auction and picks the <strong>Trump Suit</strong> (♠ Spades, ♥ Hearts, ♣ Clubs, ♦ Diamonds) or <strong>No Trump</strong>.</li>
            </ul>
          </div>

          {/* Section 4: Secret Partners */}
          <div style={cardSectionStyle}>
            <div style={sectionTitleStyle}>🤝 Secret Partners</div>
            <p style={{ color: "var(--muted)", marginBottom: "0.6rem" }}>
              The bid winner chooses secret partner cards (e.g. ♠A or ♥K):
            </p>
            <ul style={{ paddingLeft: "1.2rem", color: "var(--muted)", display: "grid", gap: "0.35rem" }}>
              <li><strong>5–6 Players:</strong> 1 Partner card called</li>
              <li><strong>7–9 Players:</strong> 2 Partner cards called</li>
              <li><strong>10–11 Players:</strong> 3 Partner cards called</li>
              <li>Whoever holds a called partner card secretly joins the <strong>Bid Team</strong>!</li>
              <li><strong>Hidden Identity:</strong> Teammates remain secret until they actually play the called card during a trick.</li>
            </ul>
          </div>

          {/* Section 5: Trick Rules */}
          <div style={cardSectionStyle}>
            <div style={sectionTitleStyle}>🃏 Playing Tricks & Following Suit</div>
            <ul style={{ paddingLeft: "1.2rem", color: "var(--muted)", display: "grid", gap: "0.35rem" }}>
              <li>The leader plays any card to start a trick.</li>
              <li><strong>Mandatory Follow Suit:</strong> If you hold cards in the lead suit, you <em>must</em> play a card of that suit.</li>
              <li>If you don’t have the lead suit, you can play a <strong>Trump card</strong> (to cut) or discard any other card.</li>
              <li><strong>Card Rank (Highest to Lowest):</strong> A &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3 &gt; 2.</li>
              <li>The highest Trump played wins the trick. If no trump was played, the highest card of the lead suit wins.</li>
              <li>The trick winner collects all points in the trick and leads the next trick.</li>
            </ul>
          </div>

          {/* Section 6: Winning */}
          <div style={cardSectionStyle}>
            <div style={sectionTitleStyle}>🏆 Winning the Game</div>
            <p style={{ color: "var(--muted)" }}>
              When all tricks are played:
            </p>
            <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.4rem" }}>
              <div style={{ padding: "0.6rem 0.8rem", borderRadius: "12px", background: "rgba(143, 174, 146, 0.15)", border: "1px solid rgba(143, 174, 146, 0.3)" }}>
                <strong style={{ color: "#547956" }}>Bid Team Wins:</strong> If (Bidder + Partner points) ≥ Bid Amount.
              </div>
              <div style={{ padding: "0.6rem 0.8rem", borderRadius: "12px", background: "rgba(216, 139, 139, 0.14)", border: "1px solid rgba(216, 139, 139, 0.28)" }}>
                <strong style={{ color: "#af6666" }}>Defenders Win:</strong> If the Bid Team fails to reach their bid target.
              </div>
            </div>
          </div>
        </div>

        {/* Footer close button */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "0.5rem" }}>
          <button
            className="soft-button"
            onClick={onClose}
            style={{
              padding: "0.65rem 2.2rem",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #e6a590, #d88f7a)",
              color: "white",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(84, 68, 60, 0.45)",
  backdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  zIndex: 300,
  padding: "1rem",
};

const cardSectionStyle = {
  borderRadius: "18px",
  padding: "1rem 1.15rem",
  background: "rgba(255, 255, 255, 0.72)",
  border: "1px solid rgba(117, 96, 84, 0.1)",
};

const sectionTitleStyle = {
  fontSize: "1.02rem",
  fontWeight: 700,
  fontFamily: '"Fraunces", serif',
  color: "var(--text)",
  marginBottom: "0.4rem",
};

function pointBadgeStyle(textColor, bgColor) {
  return {
    borderRadius: "14px",
    padding: "0.65rem 0.75rem",
    background: bgColor,
    border: `1px solid ${textColor}33`,
    color: textColor,
    textAlign: "center",
  };
}
