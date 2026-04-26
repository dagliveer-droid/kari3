import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap');

  :root {
    --bg: #f6efe8;
    --bg-warm: #f3e6db;
    --paper: rgba(255, 252, 247, 0.78);
    --paper-strong: rgba(255, 250, 244, 0.94);
    --line: rgba(117, 96, 84, 0.15);
    --text: #54443c;
    --muted: #8a766b;
    --accent: #db8f7a;
    --accent-soft: rgba(219, 143, 122, 0.16);
    --green: #8fae92;
    --red: #d88b8b;
    --gold: #d2b47d;
    --shadow: 0 20px 60px rgba(123, 98, 85, 0.14);
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body, #root {
    min-height: 100%;
  }

  body {
    color: var(--text);
    font-family: "Manrope", sans-serif;
    background:
      radial-gradient(circle at top left, rgba(255,255,255,0.75), transparent 32%),
      radial-gradient(circle at 80% 10%, rgba(219,143,122,0.12), transparent 28%),
      radial-gradient(circle at 20% 80%, rgba(143,174,146,0.14), transparent 28%),
      linear-gradient(180deg, #fbf7f2 0%, #f3ebe2 48%, #efe5dc 100%);
    background-attachment: fixed;
    overflow-x: hidden;
  }

  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.4;
    background-image:
      linear-gradient(rgba(120, 96, 84, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(120, 96, 84, 0.035) 1px, transparent 1px);
    background-size: 24px 24px;
    mask-image: radial-gradient(circle at center, black 56%, transparent 100%);
  }

  body::after {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.1;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0 1px, transparent 1px),
      radial-gradient(circle at 70% 60%, rgba(84,68,60,0.55) 0 1px, transparent 1px),
      radial-gradient(circle at 40% 80%, rgba(219,143,122,0.65) 0 1px, transparent 1px);
    background-size: 180px 180px;
  }

  #root {
    position: relative;
  }

  button, input {
    font: inherit;
  }

  input {
    color: var(--text);
  }

  ::selection {
    background: rgba(219, 143, 122, 0.24);
  }

  .soft-shell {
    position: relative;
  }

  .soft-panel {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    backdrop-filter: blur(14px);
  }

  .soft-button {
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 0.9rem 1.3rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, border-color 180ms ease;
  }

  .soft-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(123, 98, 85, 0.15);
  }

  .soft-button:active {
    transform: translateY(0);
  }

  .fade-up {
    animation: fadeUp 420ms ease both;
  }

  .table-surface {
    position: relative;
    overflow: hidden;
  }

  .table-surface::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 45%, rgba(255,255,255,0.34), transparent 30%),
      linear-gradient(135deg, rgba(255,255,255,0.14), transparent 55%);
    opacity: 0.8;
  }

  .paper-grain {
    position: relative;
  }

  .paper-grain::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.08;
    background-image:
      radial-gradient(circle at 30% 30%, #000 0 0.7px, transparent 0.8px),
      radial-gradient(circle at 70% 60%, #000 0 0.7px, transparent 0.8px),
      radial-gradient(circle at 40% 80%, #000 0 0.7px, transparent 0.8px);
    background-size: 18px 18px;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border-radius: 999px;
    padding: 0.45rem 0.8rem;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .turn-glow {
    animation: pulseGlow 1.7s ease-in-out infinite;
  }

  .card-in {
    animation: cardIn 260ms ease both;
  }

  .log-chip {
    animation: fadeUp 260ms ease both;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulseGlow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(219, 143, 122, 0.18);
    }
    50% {
      box-shadow: 0 0 0 12px rgba(219, 143, 122, 0);
    }
  }

  @keyframes cardIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(84, 68, 60, 0.05);
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(138, 118, 107, 0.4);
    border-radius: 999px;
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
