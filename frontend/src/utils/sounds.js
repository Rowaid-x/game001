/**
 * Sound effects manager for 001 Game.
 * Uses Web Audio API for lightweight sound generation.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio not available
  }
}

export const sounds = {
  tick: () => playTone(800, 0.05, 'square', 0.1),
  countdown: () => playTone(600, 0.15, 'sine', 0.2),
  correct: () => {
    playTone(523, 0.15, 'sine', 0.3);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 150);
    setTimeout(() => playTone(784, 0.3, 'sine', 0.3), 300);
  },
  timeout: () => {
    playTone(300, 0.3, 'sawtooth', 0.2);
    setTimeout(() => playTone(200, 0.5, 'sawtooth', 0.2), 300);
  },
  start: () => {
    playTone(440, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(554, 0.1, 'sine', 0.2), 100);
    setTimeout(() => playTone(659, 0.2, 'sine', 0.2), 200);
  },
  click: () => playTone(1000, 0.03, 'sine', 0.15),
  join: () => playTone(880, 0.1, 'sine', 0.15),
};

export default sounds;
