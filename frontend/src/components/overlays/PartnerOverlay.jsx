import { useState } from "react";
import { socket } from "../../socket";
import Card from "../Card";
import { ALL_CARDS, formatCard } from "../../constants";
import { initAudio, playUiSound } from "../../audio";

export default function PartnerOverlay({ roomCode, partnerCount, maxDecks }) {
  const [selections, setSelections] = useState({});
  const totalSelected = Object.values(selections).reduce((sum, quantity) => sum + quantity, 0);

  function updateQty(card, delta) {
    const current = selections[card] || 0;
    const newQty = current + delta;
    if (newQty < 0) return;
    if (newQty > maxDecks) return;
    if (delta > 0 && totalSelected >= partnerCount) return;

    setSelections(prev => {
      const next = { ...prev };
      if (newQty === 0) delete next[card];
      else next[card] = newQty;
      return next;
    });
  }

  function confirm() {
    if (totalSelected !== partnerCount) return;
    initAudio();
    playUiSound("partner");
    const cards = Object.entries(selections).map(([card, quantity]) => ({ card, quantity }));
    socket.emit("choose_partners", { roomCode, cards });
  }

  const summary = Object.entries(selections).map(([card, quantity]) => `${formatCard(card)} x${quantity}`).join(", ");

  return (
    <div style={overlay}>
      <div
        className="soft-panel fade-up"
        style={{
          width: "min(760px, 96vw)",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: "30px",
          padding: "1.5rem",
          display: "grid",
          gap: "1rem",
          background: "rgba(255,251,247,0.96)",
        }}
      >
        <div style={{ textAlign: "center", display: "grid", gap: "0.35rem" }}>
          <h2 style={{ fontFamily: '"Fraunces", serif', fontSize: "2rem", color: "var(--text)" }}>Choose Partners</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Pick the card calls for your hidden partners. Total selections must equal <strong>{partnerCount}</strong>.
            {maxDecks === 2 ? " Duplicate copies are fine if they are set as quantity 2 on one card." : ""}
          </p>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          {["SPADES", "HEARTS", "CLUBS", "DIAMONDS"].map(suit => (
            <div key={suit} className="soft-panel" style={{ borderRadius: "24px", padding: "1rem", background: "rgba(255,255,255,0.72)" }}>
              <div style={{ marginBottom: "0.8rem", color: "var(--muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                {suit}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
                {ALL_CARDS.filter(card => card.startsWith(suit)).map(card => {
                  const quantity = selections[card] || 0;
                  return (
                    <div key={card} style={{ display: "grid", gap: "0.35rem", justifyItems: "center" }}>
                      <Card card={card} small selected={quantity > 0} onClick={() => updateQty(card, quantity === 0 ? 1 : -quantity)} />
                      <div
                        className="soft-panel"
                        style={{
                          borderRadius: "999px",
                          padding: "0.2rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.2rem",
                          background: "rgba(255,251,247,0.96)",
                        }}
                      >
                        <button style={qtyBtn} onClick={() => updateQty(card, -1)}>-</button>
                        <span style={{ minWidth: "18px", textAlign: "center", color: quantity > 0 ? "var(--accent)" : "var(--muted)", fontWeight: 700 }}>
                          {quantity}
                        </span>
                        <button style={qtyBtn} onClick={() => updateQty(card, 1)}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          className="soft-panel"
          style={{
            borderRadius: "22px",
            padding: "1rem",
            background: "rgba(255,247,242,0.9)",
            color: "var(--text)",
          }}
        >
          <div style={{ fontWeight: 700 }}>Selected</div>
          <div style={{ marginTop: "0.3rem", color: "var(--muted)", lineHeight: 1.6 }}>
            {summary || "None yet"} ({totalSelected}/{partnerCount})
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            className="soft-button"
            onClick={confirm}
            disabled={totalSelected !== partnerCount}
            style={{
              minWidth: "220px",
              background: totalSelected !== partnerCount ? "rgba(138,118,107,0.18)" : "linear-gradient(135deg, #e6a590, #d88f7a)",
              color: totalSelected !== partnerCount ? "var(--muted)" : "white",
              cursor: totalSelected !== partnerCount ? "not-allowed" : "pointer",
              opacity: totalSelected !== partnerCount ? 0.7 : 1,
            }}
          >
            Confirm Partners
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(242,233,223,0.6)",
  backdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  zIndex: 100,
  padding: "1rem",
};

const qtyBtn = {
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  border: "1px solid rgba(117,96,84,0.12)",
  background: "rgba(255,255,255,0.8)",
  color: "var(--text)",
  cursor: "pointer",
  fontWeight: 700,
};
