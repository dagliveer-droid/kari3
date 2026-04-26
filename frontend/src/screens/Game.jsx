import { useEffect, useState } from "react";
import { socket } from "../socket";
import Card from "../components/Card";
import BidOverlay from "../components/overlays/BidOverlay";
import TrumpOverlay from "../components/overlays/TrumpOverlay";
import PartnerOverlay from "../components/overlays/PartnerOverlay";
import GameOverOverlay from "../components/overlays/GameOverOverlay";
import { SUIT_NAMES, formatCard } from "../constants";
import { initAudio, playUiSound } from "../audio";

export default function Game({ roomCode, myId, myName, state, myHand }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  const [trickCards, setTrickCards] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [log, setLog] = useState([]);

  function addLog(message) {
    setLog(prev => [...prev.slice(-5), message]);
  }

  useEffect(() => {
    const handleSelectTrump = () => {
      initAudio();
      playUiSound("trump");
    };

    const handleSelectPartners = () => initAudio();
    const handlePartnersSet = () => {};

    const handleTrumpChosen = data => {
      const trumpName = data.trump ? SUIT_NAMES[data.trump] : "No Trump";
      addLog(`${data.name} chose ${trumpName}`);
      playUiSound("trump");
    };

    const handleCardPlayed = data => {
      setTrickCards(data.trick);
      playUiSound("card");
    };

    const handleTrickResolved = data => {
      addLog(`${data.winnerName} wins the trick (+${data.points})`);
      playUiSound("trick");
      setTimeout(() => setTrickCards([]), 1400);
    };

    const handlePartnerRevealed = data => {
      const extra = data.totalNeeded > 1 ? ` (${data.revealedSoFar}/${data.totalNeeded})` : "";
      addLog(`${data.name} revealed as partner${extra}`);
      playUiSound("partner");
      if (data.allPartnersRevealed) addLog("All partners have been revealed");
    };

    const handleBidPlaced = data => {
      addLog(`${data.name} bid ${data.bid}`);
      playUiSound("bid");
    };

    const handleBidPassed = data => addLog(`${data.name} passed`);

    const handlePlayerLeft = data => {
      addLog(data.disconnected ? `${data.name} disconnected` : `${data.name} left`);
    };

    const handleViewingCountdown = ({ seconds }) => setCountdown(seconds);
    const handleGameOver = () => playUiSound("gameover");

    socket.on("select_trump", handleSelectTrump);
    socket.on("select_partners", handleSelectPartners);
    socket.on("partners_set", handlePartnersSet);
    socket.on("trump_chosen", handleTrumpChosen);
    socket.on("card_played", handleCardPlayed);
    socket.on("trick_resolved", handleTrickResolved);
    socket.on("partner_revealed", handlePartnerRevealed);
    socket.on("bid_placed", handleBidPlaced);
    socket.on("bid_passed", handleBidPassed);
    socket.on("player_left", handlePlayerLeft);
    socket.on("viewing_countdown", handleViewingCountdown);
    socket.on("game_over", handleGameOver);

    return () => {
      socket.off("select_trump", handleSelectTrump);
      socket.off("select_partners", handleSelectPartners);
      socket.off("partners_set", handlePartnersSet);
      socket.off("trump_chosen", handleTrumpChosen);
      socket.off("card_played", handleCardPlayed);
      socket.off("trick_resolved", handleTrickResolved);
      socket.off("partner_revealed", handlePartnerRevealed);
      socket.off("bid_placed", handleBidPlaced);
      socket.off("bid_passed", handleBidPassed);
      socket.off("player_left", handlePlayerLeft);
      socket.off("viewing_countdown", handleViewingCountdown);
      socket.off("game_over", handleGameOver);
    };
  }, []);

  function handleCardClick(card, idx) {
    initAudio();
    if (selectedCard === card && selectedCardIdx === idx) {
      socket.emit("play_card", { roomCode, card });
      return;
    }
    setSelectedCard(card);
    setSelectedCardIdx(idx);
  }

  const isMyTurn = state.currentTurn === myId && state.phase === "playing" && !state.paused;
  const trump = state.trump ? SUIT_NAMES[state.trump] : state.phase === "playing" ? "No Trump" : "-";
  const otherPlayers = (state.players || []).filter(player => player.id !== myId);
  const isSelectedCardValid = selectedCardIdx !== null && myHand[selectedCardIdx] === selectedCard;
  const showTrump = state.phase === "trump" && state.highestBidder === myId;
  const showPartner = state.phase === "partner" && state.highestBidder === myId;
  const partnerInfo = {
    count: state.config?.partners || 1,
    decks: state.config?.decks || 1,
  };

  return (
    <div
      className="soft-shell"
      style={{
        minHeight: "100vh",
        padding: "1rem",
        paddingBottom: state.phase === "bidding" ? "8.5rem" : "1rem",
      }}
    >
      <div
        className="table-surface fade-up"
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          minHeight: "calc(100vh - 2rem)",
          borderRadius: "34px",
          padding: "1rem",
          background:
            "linear-gradient(180deg, rgba(255,249,243,0.75), rgba(242,233,223,0.82))",
          border: "1px solid rgba(117,96,84,0.1)",
          boxShadow: "0 24px 80px rgba(123,98,85,0.15)",
          display: "grid",
          gap: "0.9rem",
          position: "relative",
        }}
      >
        {state.phase === "viewing" && (
          <div
            className="soft-panel fade-up"
            style={{
              borderRadius: "20px",
              padding: "0.9rem 1.1rem",
              textAlign: "center",
              background: "rgba(255,252,247,0.92)",
              color: "var(--text)",
              fontWeight: 700,
            }}
          >
            Study your cards. Bidding starts in <span style={{ color: "var(--accent)" }}>{countdown !== null ? `${countdown}s` : "..."}</span>
          </div>
        )}

        {state.paused && (
          <div
            className="soft-panel fade-up"
            style={{
              borderRadius: "20px",
              padding: "0.9rem 1.1rem",
              background: "rgba(216,139,139,0.12)",
              borderColor: "rgba(216,139,139,0.2)",
              color: "#9d6363",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {state.pauseReason || "Game is paused while a player reconnects"}
          </div>
        )}

        {state.phase === "bidding" && <BidOverlay state={state} roomCode={roomCode} myId={myId} />}
        {showTrump && state.highestBidder === myId && <TrumpOverlay roomCode={roomCode} />}
        {showPartner && state.highestBidder === myId && (
          <PartnerOverlay roomCode={roomCode} partnerCount={partnerInfo.count} maxDecks={partnerInfo.decks} />
        )}
        {state.gameOver && state.gameResult && <GameOverOverlay result={state.gameResult} />}

        <div
          className="soft-panel paper-grain"
          style={{
            borderRadius: "24px",
            padding: "1rem 1.2rem",
            background: "rgba(255,252,247,0.86)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.8rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            {[
              { label: "Room", value: roomCode },
              { label: "Trump", value: trump },
              { label: "Bid", value: state.highestBid || "-" },
              { label: "Phase", value: state.phase || "-" },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.68)",
                  border: "1px solid rgba(117,96,84,0.09)",
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  {item.label}
                </div>
                <div style={{ marginTop: "0.2rem", color: "var(--text)", fontWeight: 700 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div
            className={`status-pill ${isMyTurn ? "turn-glow" : ""}`}
            style={{
              background: isMyTurn ? "rgba(219,143,122,0.16)" : "rgba(138,118,107,0.12)",
              color: isMyTurn ? "#b56d58" : "var(--muted)",
              border: "1px solid rgba(117,96,84,0.08)",
            }}
          >
            {isMyTurn ? "Your turn" : state.paused ? "Paused" : "Waiting"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.9rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: "center" }}>
            {otherPlayers.map(player => {
              const isActive = state.currentTurn === player.id && state.phase === "playing" && !state.paused;
              const isPartner = state.revealedPartners?.includes(player.id);
              return (
                <div
                  key={player.id}
                  className={`soft-panel fade-up ${isActive ? "turn-glow" : ""}`}
                  style={{
                    borderRadius: "22px",
                    padding: "0.95rem 1rem",
                    minWidth: "128px",
                    background: isActive ? "rgba(255,245,240,0.95)" : "rgba(255,252,247,0.78)",
                    borderColor: isPartner ? "rgba(143,174,146,0.35)" : "rgba(117,96,84,0.08)",
                    opacity: player.connected === false ? 0.56 : 1,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontFamily: '"Fraunces", serif', fontSize: "1rem", color: "var(--text)" }}>{player.name}</div>
                  <div style={{ marginTop: "0.3rem", color: "var(--muted)", fontSize: "0.83rem" }}>
                    {state.scores?.[player.id] || 0} pts
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.55rem", flexWrap: "wrap" }}>
                    {player.connected === false && (
                      <span className="status-pill" style={{ background: "rgba(216,139,139,0.14)", color: "#af6666" }}>
                        Offline
                      </span>
                    )}
                    {isPartner && (
                      <span className="status-pill" style={{ background: "rgba(143,174,146,0.16)", color: "#68806a" }}>
                        Partner
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.8rem", flexWrap: "wrap" }}>
            <div className="soft-panel" style={scoreCardStyle("#7e9981")}>
              Bid Team <strong>{state.teamScores?.bidTeam || 0}</strong> / {state.highestBid || "-"}
            </div>
            <div className="soft-panel" style={scoreCardStyle("#c67d7d")}>
              Opp Team <strong>{state.teamScores?.oppTeam || 0}</strong>
            </div>
          </div>

          <div
            className="soft-panel paper-grain"
            style={{
              borderRadius: "28px",
              minHeight: "270px",
              padding: "1.5rem",
              background:
                "radial-gradient(circle at center, rgba(255,255,255,0.45), transparent 35%), linear-gradient(180deg, rgba(255,252,247,0.82), rgba(247,239,232,0.82))",
              display: "grid",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                Current Trick
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center", minHeight: "120px", alignItems: "center" }}>
                {trickCards.length > 0 ? trickCards.map((play, index) => {
                  const playerName = state.players?.find(player => player.id === play.player)?.name || "?";
                  return (
                    <div key={`${play.player}-${index}`} className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.45rem" }}>
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{playerName}</div>
                      <Card card={play.card} small disabled />
                    </div>
                  );
                }) : (
                  <div style={{ color: "var(--muted)", fontStyle: "italic" }}>
                    {state.phase === "playing" ? "Play a card to start the trick" : "Waiting for the next phase"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.45rem" }}>
            {log.slice(-3).map((message, index) => (
              <div
                key={`${message}-${index}`}
                className="soft-panel log-chip"
                style={{
                  borderRadius: "18px",
                  padding: "0.65rem 0.95rem",
                  background: "rgba(255,252,247,0.82)",
                  color: "var(--text)",
                  fontSize: "0.88rem",
                }}
              >
                {message}
              </div>
            ))}
          </div>

          <div
            className="soft-panel paper-grain"
            style={{
              borderRadius: "28px",
              padding: "1.2rem",
              background: "rgba(255,252,247,0.86)",
              display: "grid",
              gap: "0.8rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: '"Fraunces", serif', fontSize: "1.4rem", color: "var(--text)" }}>{myName || "You"}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{myHand.length} cards in hand</div>
              </div>
              <div
                className="status-pill"
                style={{
                  background: isMyTurn ? "rgba(219,143,122,0.16)" : "rgba(138,118,107,0.12)",
                  color: isMyTurn ? "#b56d58" : "var(--muted)",
                }}
              >
                {isMyTurn ? "Play a card" : "Hold"}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
              {myHand.map((card, index) => (
                <Card
                  key={`${card}-${index}`}
                  card={card}
                  selected={isSelectedCardValid && selectedCard === card && selectedCardIdx === index}
                  disabled={!isMyTurn}
                  onClick={() => handleCardClick(card, index)}
                />
              ))}
            </div>

            {isSelectedCardValid && isMyTurn && (
              <div style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic", fontSize: "0.88rem" }}>
                Click {formatCard(selectedCard)} again to play it
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function scoreCardStyle(color) {
  return {
    borderRadius: "18px",
    padding: "0.8rem 1rem",
    background: "rgba(255,252,247,0.82)",
    color,
    fontSize: "0.92rem",
    border: "1px solid rgba(117,96,84,0.08)",
  };
}
