/**
 * Scoring tiers — mirrors backend scoring.py
 */
export const SCORING_TIERS = [
  { maxSeconds: 30, points: 100, label: '100 pts' },
  { maxSeconds: 60, points: 75, label: '75 pts' },
  { maxSeconds: 90, points: 50, label: '50 pts' },
  { maxSeconds: 120, points: 30, label: '30 pts' },
  { maxSeconds: 180, points: 15, label: '15 pts' },
  { maxSeconds: 240, points: 10, label: '10 pts' },
];

export const DEFAULT_MAX_TIME = 240;
export const DEFAULT_TOTAL_ROUNDS = 10;

/**
 * Get timer color based on elapsed seconds.
 */
export function getTimerColor(elapsed, maxTime = DEFAULT_MAX_TIME) {
  const ratio = elapsed / maxTime;
  if (ratio < 0.25) return '#22c55e'; // green
  if (ratio < 0.5) return '#eab308';  // yellow
  if (ratio < 0.75) return '#f97316'; // orange
  return '#ef4444';                    // red
}

/**
 * Get timer background gradient class based on elapsed seconds.
 */
export function getTimerBgClass(elapsed, maxTime = DEFAULT_MAX_TIME) {
  const ratio = elapsed / maxTime;
  if (ratio < 0.25) return 'from-green-900/30 to-green-950/30';
  if (ratio < 0.5) return 'from-yellow-900/30 to-yellow-950/30';
  if (ratio < 0.75) return 'from-orange-900/30 to-orange-950/30';
  return 'from-red-900/30 to-red-950/30';
}

/**
 * Calculate points for display (client-side mirror).
 */
export function calculatePoints(timeTaken) {
  for (const tier of SCORING_TIERS) {
    if (timeTaken <= tier.maxSeconds) return tier.points;
  }
  return 0;
}

/**
 * Format seconds to mm:ss display.
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate a unique session key for the browser.
 */
export function getOrCreateSessionKey() {
  let key = localStorage.getItem('game001_session');
  if (!key) {
    key = 'sess_' + crypto.randomUUID();
    localStorage.setItem('game001_session', key);
  }
  return key;
}

/**
 * Get the WebSocket URL for a game.
 */
export function getWsUrl(gameCode) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.VITE_WS_HOST || window.location.host;
  return `${protocol}//${host}/ws/game/${gameCode}/`;
}

/**
 * Get the base URL for QR codes.
 */
export function getBaseUrl() {
  return import.meta.env.VITE_BASE_URL || window.location.origin;
}
