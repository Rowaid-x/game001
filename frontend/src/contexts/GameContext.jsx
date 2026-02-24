import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import sounds from '../utils/sounds';

const GameContext = createContext(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function GameProvider({ gameCode, children }) {
  const [gameState, setGameState] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [error, setError] = useState(null);

  const handleMessage = useCallback((msg) => {
    setError(null);

    switch (msg.type) {
      case 'game_state':
        setGameState(msg.data);
        break;

      case 'player_joined':
        sounds.join();
        setGameState((prev) => prev ? { ...prev } : prev);
        // Full state comes with next broadcast; trigger re-fetch
        break;

      case 'team_updated':
      case 'settings_updated':
      case 'round_updated':
      case 'actor_ready':
        setGameState(msg.data);
        break;

      case 'game_started':
        sounds.start();
        setGameState(msg.data);
        setRoundResult(null);
        break;

      case 'timer_started':
        sounds.start();
        setGameState(msg.data);
        setRoundResult(null);
        break;

      case 'round_ended':
        setGameState(msg.data);
        setRoundResult(msg.result || {});
        if (msg.result?.status === 'guessed') {
          sounds.correct();
        } else {
          sounds.timeout();
        }
        break;

      case 'game_finished':
        setGameState(msg.data);
        sounds.correct();
        break;

      case 'error':
        setError(msg.message);
        break;

      default:
        break;
    }
  }, []);

  const { connected, sendMessage } = useWebSocket(gameCode, handleMessage);

  // Re-fetch full state when reconnecting
  useEffect(() => {
    if (connected && !gameState) {
      // Initial state is sent on connect by the consumer
    }
  }, [connected, gameState]);

  const actions = {
    joinGame: (playerName, sessionKey) =>
      sendMessage({ type: 'join_game', player_name: playerName, session_key: sessionKey }),

    addPlayer: (playerName, teamId) =>
      sendMessage({ type: 'add_player', player_name: playerName, team_id: teamId }),

    assignPlayer: (playerId, teamId) =>
      sendMessage({ type: 'assign_player', player_id: playerId, team_id: teamId }),

    updateTeam: (teamId, name, color) =>
      sendMessage({ type: 'update_team', team_id: teamId, name, color }),

    startGame: () =>
      sendMessage({ type: 'start_game' }),

    selectActor: (roundId, playerId) =>
      sendMessage({ type: 'select_actor', round_id: roundId, player_id: playerId }),

    selectCategory: (roundId, categoryId) =>
      sendMessage({ type: 'select_category', round_id: roundId, category_id: categoryId }),

    actorReady: (roundId) =>
      sendMessage({ type: 'actor_ready', round_id: roundId }),

    startTimer: (roundId) =>
      sendMessage({ type: 'start_timer', round_id: roundId }),

    correctGuess: (roundId) =>
      sendMessage({ type: 'correct_guess', round_id: roundId }),

    timeoutRound: (roundId) =>
      sendMessage({ type: 'timeout', round_id: roundId }),

    skipRound: (roundId) =>
      sendMessage({ type: 'skip_round', round_id: roundId }),

    nextRound: () =>
      sendMessage({ type: 'next_round' }),

    updateSettings: (settings) =>
      sendMessage({ type: 'update_settings', ...settings }),

    clearRoundResult: () => setRoundResult(null),
  };

  return (
    <GameContext.Provider value={{
      gameState,
      roundResult,
      connected,
      error,
      ...actions,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export default GameContext;
