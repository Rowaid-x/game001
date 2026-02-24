import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CelebrationOverlay from './CelebrationOverlay';
import { Trophy, Clock, Star, RotateCcw, Home } from 'lucide-react';

export default function HostScoreboard() {
  const { gameState } = useGame();
  const navigate = useNavigate();
  const [scoreboard, setScoreboard] = useState(null);
  const [showCelebration, setShowCelebration] = useState(true);

  useEffect(() => {
    if (gameState?.code) {
      api.getScoreboard(gameState.code).then(setScoreboard).catch(() => {});
    }
    const timer = setTimeout(() => setShowCelebration(false), 5000);
    return () => clearTimeout(timer);
  }, [gameState?.code]);

  const teams = gameState?.teams?.sort((a, b) => b.total_score - a.total_score) || [];
  const winner = teams[0];
  const loser = teams[1];

  return (
    <>
      {showCelebration && <CelebrationOverlay />}

      <div className="min-h-screen flex flex-col items-center justify-center p-6 lg:p-10">
        {/* Winner announcement */}
        <div className="text-center mb-10 animate-bounce-in">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-5xl lg:text-7xl font-display font-black text-white mb-2">
            Game Over!
          </h1>
          {winner && (
            <div className="mt-4">
              <p className="text-white/50 text-xl mb-2">Winner</p>
              <div
                className="inline-block px-8 py-4 rounded-2xl"
                style={{ backgroundColor: winner.color + '30', border: `2px solid ${winner.color}` }}
              >
                <span className="text-4xl lg:text-5xl font-black text-white">{winner.name}</span>
                <span className="block text-2xl font-bold mt-1" style={{ color: winner.color }}>
                  {winner.total_score} points
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Score comparison */}
        <div className="w-full max-w-2xl mb-10">
          <div className="grid grid-cols-2 gap-6">
            {teams.map((team, i) => (
              <div
                key={team.id}
                className="card text-center animate-slide-up"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  borderColor: team.color + '40',
                }}
              >
                <div className="text-4xl mb-2">{i === 0 ? '🏆' : '🥈'}</div>
                <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: team.color }} />
                <h3 className="text-2xl font-bold text-white">{team.name}</h3>
                <div className="text-5xl font-black mt-2" style={{ color: team.color }}>
                  {team.total_score}
                </div>
                <p className="text-white/40 text-sm mt-1">points</p>
              </div>
            ))}
          </div>
        </div>

        {/* Best round stats */}
        {scoreboard?.best_round && (
          <div className="card w-full max-w-md mb-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 mb-3">
              <Star className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-bold text-white">Best Round</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-white/40 text-xs mb-1">Actor</div>
                <div className="text-white font-bold text-sm">{scoreboard.best_round.actor}</div>
              </div>
              <div>
                <div className="text-white/40 text-xs mb-1">Time</div>
                <div className="text-emerald-400 font-bold text-sm flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  {scoreboard.best_round.time_taken?.toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="text-white/40 text-xs mb-1">Points</div>
                <div className="text-yellow-400 font-bold text-sm">{scoreboard.best_round.points}</div>
              </div>
            </div>
            <div className="mt-3 text-center text-white/50 text-sm">
              "{scoreboard.best_round.prompt}"
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <button
            onClick={() => navigate('/')}
            className="btn-ghost flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Home
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-primary flex items-center gap-2 text-lg"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>
        </div>
      </div>
    </>
  );
}
