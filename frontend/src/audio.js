let audioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

export function initAudio() {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    ctx.resume();
  }
}

function playTone({ frequency, duration, type = "sine", gain = 0.05, delay = 0 }) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + delay;
  const end = start + duration;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);

  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end);
}

export function playUiSound(kind) {
  initAudio();

  switch (kind) {
    case "join":
      playTone({ frequency: 420, duration: 0.12, type: "triangle", gain: 0.035 });
      playTone({ frequency: 540, duration: 0.18, type: "triangle", gain: 0.03, delay: 0.04 });
      break;
    case "bid":
      playTone({ frequency: 310, duration: 0.12, type: "triangle", gain: 0.04 });
      playTone({ frequency: 390, duration: 0.12, type: "triangle", gain: 0.03, delay: 0.06 });
      break;
    case "card":
      playTone({ frequency: 250, duration: 0.07, type: "square", gain: 0.022 });
      break;
    case "trump":
      playTone({ frequency: 392, duration: 0.14, type: "triangle", gain: 0.035 });
      playTone({ frequency: 523, duration: 0.2, type: "triangle", gain: 0.03, delay: 0.08 });
      break;
    case "partner":
      playTone({ frequency: 494, duration: 0.1, type: "sine", gain: 0.03 });
      playTone({ frequency: 659, duration: 0.16, type: "sine", gain: 0.024, delay: 0.05 });
      break;
    case "trick":
      playTone({ frequency: 370, duration: 0.1, type: "triangle", gain: 0.04 });
      playTone({ frequency: 554, duration: 0.18, type: "triangle", gain: 0.03, delay: 0.07 });
      break;
    case "start":
      playTone({ frequency: 300, duration: 0.11, type: "triangle", gain: 0.04 });
      playTone({ frequency: 400, duration: 0.11, type: "triangle", gain: 0.03, delay: 0.05 });
      playTone({ frequency: 520, duration: 0.18, type: "triangle", gain: 0.028, delay: 0.1 });
      break;
    case "gameover":
      playTone({ frequency: 280, duration: 0.18, type: "triangle", gain: 0.03 });
      playTone({ frequency: 210, duration: 0.24, type: "triangle", gain: 0.02, delay: 0.14 });
      break;
    default:
      break;
  }
}
