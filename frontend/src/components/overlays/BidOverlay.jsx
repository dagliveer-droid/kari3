import { useEffect, useState } from "react";
import { socket } from "../../socket";
import { initAudio, playUiSound } from "../../audio";

export default function BidOverlay({ state, roomCode, myId }) {
  const isMyTurn = state.currentBidder === myId && !state.paused;
  const minBid = (state.highestBid || 0) + 5;
  const maxBid = state.config?.totalPoints || 250;
  const [bidValue, setBidValue] = useState(minBid);

  useEffect(() => {
    setBidValue(minBid);
  }, [minBid]);

  const bidderName = state.players?.find(player => player.id === state.currentBidder)?.name || "...";
  const highBidderName = state.players?.find(player => player.id === state.highestBidder)?.name;

  function placeBid() {
    initAudio();
    playUiSound("bid");
    socket.emit("place_bid", { roomCode, bid: bidValue });
  }

  function passBid() {
    initAudio();
    socket.emit("pass_bid", { roomCode });
  }

  return (
    <div
      className="soft-panel fade-up"
      style={{
        position: "fixed",
        left: "max(1rem, calc((100vw - 1240px) / 2 + 1rem))",
        right: "max(1rem, calc((100vw - 1240px) / 2 + 1rem))",
        bottom: "1rem",
        zIndex: 80,
        borderRadius: "28px",
        padding: "1rem 1.15rem",
        background: "rgba(255,250,244,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.9rem",
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: "90px" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
          Current Bid
        </div>
        <div style={{ marginTop: "0.2rem", fontFamily: '"Fraunces", serif', fontSize: "2rem", color: "var(--accent)" }}>
          {state.highestBid > 0 ? state.highestBid : "-"}
        </div>
        {highBidderName && <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>by {highBidderName}</div>}
      </div>

      <div style={{ flex: 1, textAlign: "center" }}>
        <div
          className={`status-pill ${isMyTurn ? "turn-glow" : ""}`}
          style={{
            display: "inline-flex",
            background: isMyTurn ? "rgba(219,143,122,0.16)" : "rgba(138,118,107,0.12)",
            color: isMyTurn ? "#b56d58" : "var(--muted)",
          }}
        >
          {isMyTurn ? "Your turn to bid" : `Waiting for ${bidderName}`}
        </div>
      </div>

      {isMyTurn && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div
            className="soft-panel"
            style={{
              borderRadius: "999px",
              padding: "0.35rem",
              background: "rgba(255,255,255,0.72)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <button style={ctrlBtn} onClick={() => setBidValue(value => Math.max(minBid, value - 5))}>-5</button>
            <span style={{ minWidth: "60px", textAlign: "center", fontWeight: 800, color: "var(--text)" }}>{bidValue}</span>
            <button style={ctrlBtn} onClick={() => setBidValue(value => Math.min(maxBid, value + 5))}>+5</button>
          </div>
          <button className="soft-button" style={{ background: "linear-gradient(135deg, #e6a590, #d88f7a)", color: "white" }} onClick={placeBid}>
            Bid {bidValue}
          </button>
          <button className="soft-button" style={{ background: "rgba(255,255,255,0.72)", color: "var(--text)", borderColor: "rgba(117,96,84,0.12)" }} onClick={passBid}>
            Pass
          </button>
        </div>
      )}
    </div>
  );
}

const ctrlBtn = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  border: "1px solid rgba(117,96,84,0.12)",
  background: "rgba(255,250,244,0.96)",
  color: "var(--text)",
  cursor: "pointer",
  fontWeight: 700,
};
