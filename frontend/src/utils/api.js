/**
 * API client for 001 Game backend.
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(method, path, data = null) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) {
    options.body = JSON.stringify(data);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || 'Request failed');
  }
  return res.json();
}

const api = {
  // Games
  createGame: (hostName, sessionKey) => request('POST', '/games/', { host_name: hostName, session_key: sessionKey }),
  getGame: (code) => request('GET', `/games/${code}/`),
  joinGame: (code, playerName, sessionKey) =>
    request('POST', `/games/${code}/join/`, { player_name: playerName, session_key: sessionKey }),
  updateSettings: (code, settings) => request('PATCH', `/games/${code}/settings/`, settings),
  startGame: (code) => request('POST', `/games/${code}/start/`),
  assignPlayer: (code, playerId, teamId) =>
    request('POST', `/games/${code}/assign-player/`, { player_id: playerId, team_id: teamId }),
  updateTeam: (code, teamId, data) => request('PATCH', `/games/${code}/teams/${teamId}/`, data),
  getScoreboard: (code) => request('GET', `/games/${code}/scoreboard/`),

  // Categories
  getCategories: () => request('GET', '/categories/'),

  // Rounds
  getPrompt: (roundId, token) => request('GET', `/rounds/${roundId}/prompt/?token=${token}`),
  selectActor: (roundId, playerId) =>
    request('POST', `/rounds/${roundId}/select-actor/`, { player_id: playerId }),
  selectCategory: (roundId, categoryId) =>
    request('POST', `/rounds/${roundId}/select-category/`, { category_id: categoryId }),
  actorReady: (roundId) => request('POST', `/rounds/${roundId}/actor-ready/`),
  startTimer: (roundId) => request('POST', `/rounds/${roundId}/start-timer/`),
  correctGuess: (roundId) => request('POST', `/rounds/${roundId}/correct/`),
  timeoutRound: (roundId) => request('POST', `/rounds/${roundId}/timeout/`),
  skipRound: (roundId) => request('POST', `/rounds/${roundId}/skip/`),
  nextRound: (gameCode) => request('POST', '/rounds/next-round/', { game_code: gameCode }),
};

export default api;
