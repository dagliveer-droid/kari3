import { useState } from "react";
import { cardToImage, SUIT_SYMBOLS } from "../constants";

export default function Card({ card, small, selected, disabled, onClick }) {
  const [imgError, setImgError] = useState(false);
  const [suit, rank] = card.split("_");
  const isKaariTeedi = suit === "SPADES" && rank === "3";
  const isRed = ["HEARTS", "DIAMONDS"].includes(suit);

  const width = small ? 66 : 82;
  const height = small ? 94 : 118;

  const baseStyle = {
    width,
    height,
    borderRadius: "18px",
    cursor: disabled ? "not-allowed" : "pointer",
    border: selected
      ? "1px solid rgba(219,143,122,0.6)"
      : isKaariTeedi
        ? "1px solid rgba(210,180,125,0.8)"
        : "1px solid rgba(117,96,84,0.12)",
    boxShadow: selected
      ? "0 18px 30px rgba(219,143,122,0.22)"
      : "0 10px 22px rgba(123,98,85,0.14)",
    transform: selected ? "translateY(-14px) rotate(-1deg)" : "translateY(0)",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, opacity 160ms ease",
    opacity: disabled ? 0.5 : 1,
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(180deg, #fffdf9 0%, #f5ede4 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  function handleMouseEnter(event) {
    if (disabled) return;
    event.currentTarget.style.transform = selected ? "translateY(-14px) rotate(-1deg)" : "translateY(-8px) rotate(-1deg)";
    event.currentTarget.style.boxShadow = selected
      ? "0 18px 30px rgba(219,143,122,0.22)"
      : "0 18px 28px rgba(123,98,85,0.18)";
  }

  function handleMouseLeave(event) {
    event.currentTarget.style.transform = selected ? "translateY(-14px) rotate(-1deg)" : "translateY(0)";
    event.currentTarget.style.boxShadow = selected
      ? "0 18px 30px rgba(219,143,122,0.22)"
      : "0 10px 22px rgba(123,98,85,0.14)";
  }

  if (imgError) {
    return (
      <div
        className="card-in"
        style={{ ...baseStyle, flexDirection: "column", gap: "3px" }}
        onClick={!disabled ? onClick : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: small ? "0.95rem" : "1.2rem",
            fontWeight: 700,
            color: isRed ? "#c46f6f" : "#3f3733",
          }}
        >
          {rank}
        </span>
        <span
          style={{
            fontSize: small ? "1.1rem" : "1.45rem",
            color: isRed ? "#c46f6f" : "#3f3733",
          }}
        >
          {SUIT_SYMBOLS[suit]}
        </span>
      </div>
    );
  }

  return (
    <div
      className="card-in"
      style={baseStyle}
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={cardToImage(card)}
        alt={`${rank} of ${suit}`}
        onError={() => setImgError(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "16px",
          pointerEvents: "none",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "auto 10px 8px 10px",
          height: "16px",
          background: "linear-gradient(180deg, transparent, rgba(84,68,60,0.12))",
          borderRadius: "999px",
          pointerEvents: "none",
        }}
      />
      {isKaariTeedi && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "16px",
            border: "1px solid rgba(210,180,125,0.55)",
            boxShadow: "inset 0 0 22px rgba(210,180,125,0.28)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
