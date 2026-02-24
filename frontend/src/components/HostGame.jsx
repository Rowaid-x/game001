import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useGame } from '../contexts/GameContext';
import { getBaseUrl, formatTime, getTimerColor, getTimerBgClass } from '../utils/constants';
import useTimer from '../hooks/useTimer';
import api from '../utils/api';
import CategoryPicker from './CategoryPicker';
import RoundResult from './RoundResult';
import CelebrationOverlay from './CelebrationOverlay';
import { Check, SkipForward, ChevronRight, Timer, Users } from 'lucide-react';

export default function HostGame() {
  const {
    gameState, roundResult,
    selectActor, selectCategory, startTimer,
    correctGuess, timeoutRound, skipRound, nextRound,
    clearRoundResult,
  } = useGame();

  const [categories, setCategories] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);

  const round = gameState?.round;
  const maxTime = gameState?.max_time_per_turn || 240;

  const handleTimeout = useCallback(() => {
    if (round?.id && round.status === 'active') {
      timeoutRound(round.id);
    }
  }, [round?.id, round?.status, timeoutRound]);

  const { elapsed, running } = useTimer(
    round?.status === 'active' ? round.started_at : null,
    maxTime,
    handleTimeout
  );

  useEffect(() => {
    api.getCategories().then((res) => {
      setCategories(res.results || res);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (roundResult?.status === 'guessed') {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [roundResult]);

  const handleCorrect = () => {
    if (round?.id) correctGuess(round.id);
  };

  const handleSkip = () => {
    if (round?.id) skipRound(round.id);
  };

  const handleNextRound = () => {
    clearRoundResult();
    nextRound();
  };

  const handleSelectActor = (playerId) => {
    if (round?.id) selectActor(round.id, playerId);
  };

  const handleSelectCategory = (categoryId) => {
    if (round?.id) selectCategory(round.id, categoryId);
  };

  const handleStartTimer = () => {
    if (round?.id) startTimer(round.id);
  };

  if (!round) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTeam = gameState.teams?.find((t) => t.id === round.team_id);
  const otherTeam = gameState.teams?.find((t) => t.id !== round.team_id);
  const timerColor = getTimerColor(elapsed, maxTime);
  const timerBg = getTimerBgClass(elapsed, maxTime);

  // Round result display
  if (roundResult && (roundResult.status === 'guessed' || roundResult.status === 'timeout' || roundResult.status === 'skipped')) {
    return (
      <>
        {showCelebration && roundResult.status === 'guessed' && <CelebrationOverlay />}
        <RoundResult
          result={roundResult}
          round={round}
          gameState={gameState}
          onNext={handleNextRound}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${round.status === 'active' ? timerBg : 'from-gray-950 to-gray-950'} transition-colors duration-1000`}>
      {/* Top bar: scores + round info */}
      <div className="flex items-center justify-between p-4 lg:p-6">
        {/* Team 1 score */}
        {gameState.teams?.map((team) => (
          <div
            key={team.id}
            className="flex items-center gap-3 px-4 py-2 rounded-2xl transition-all"
            style={{
              backgroundColor: team.id === round.team_id ? team.color + '25' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${team.id === round.team_id ? team.color + '60' : 'transparent'}`,
            }}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
            <span className="text-white font-bold text-lg">{team.name}</span>
            <span className="text-white font-black text-2xl ml-2">{team.total_score}</span>
          </div>
        ))}

        {/* Round counter */}
        <div className="text-center">
          <div className="text-white/40 text-sm">Round</div>
          <div className="text-white font-black text-2xl">
            {gameState.current_round}<span className="text-white/30">/{gameState.total_rounds}</span>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">

        {/* Selecting Actor */}
        {round.status === 'selecting_actor' && (
          <div className="text-center animate-fade-in w-full max-w-2xl">
            <div className="mb-6">
              <div className="inline-block px-6 py-2 rounded-full mb-4" style={{ backgroundColor: activeTeam?.color + '30' }}>
                <span className="text-white font-bold text-xl" style={{ color: activeTeam?.color }}>
                  {activeTeam?.name}'s Turn!
                </span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-display font-black text-white">Who's Acting?</h2>
              <p className="text-white/40 mt-2 text-lg">Select a player from the team</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto">
              {activeTeam?.players?.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSelectActor(player.id)}
                  className="px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30
                             rounded-2xl text-white font-bold text-lg transition-all active:scale-95"
                >
                  {player.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selecting Category */}
        {round.status === 'selecting_category' && (
          <div className="text-center animate-fade-in w-full max-w-3xl">
            <div className="mb-6">
              <p className="text-white/50 mb-1">
                <span className="font-bold text-white">{round.actor_name}</span> is acting
              </p>
              <h2 className="text-4xl lg:text-5xl font-display font-black text-white">Pick a Category</h2>
            </div>
            <CategoryPicker
              categories={categories}
              selected={[]}
              onChange={() => {}}
              onSelect={handleSelectCategory}
              singleSelect
            />
          </div>
        )}

        {/* Showing QR — Actor scans to see prompt on their phone */}
        {round.status === 'showing_qr' && (
          <div className="text-center animate-scale-in">
            <p className="text-white/50 mb-2 text-lg">
              <span className="font-bold text-white">{round.actor_name}</span>, scan this QR code
            </p>
            <h2 className="text-3xl lg:text-4xl font-display font-black text-white mb-6">
              {round.category_icon} {round.category_name}
            </h2>
            <div className="inline-block bg-white p-6 rounded-3xl shadow-2xl mb-4">
              <QRCodeSVG
                value={`${getBaseUrl()}/act/${round.id}?token=${round.token}`}
                size={280}
                level="M"
              />
            </div>
            <p className="text-white/30 text-sm">Only the actor should scan this code</p>
          </div>
        )}

        {/* Actor Ready — Actor has seen the prompt on their phone */}
        {round.status === 'actor_ready' && (
          <div className="text-center animate-bounce-in">
            <div className="text-6xl mb-4">🎭</div>
            <h2 className="text-4xl lg:text-5xl font-display font-black text-white mb-4">
              {round.actor_name} is Ready!
            </h2>
            <p className="text-white/50 text-lg mb-8">Press start when the actor is in position</p>
            <button
              onClick={handleStartTimer}
              className="px-12 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-2xl rounded-2xl
                         hover:from-emerald-500 hover:to-emerald-400 active:scale-95 transition-all duration-200
                         shadow-lg shadow-emerald-500/25 flex items-center gap-3 mx-auto"
            >
              <Timer className="w-7 h-7" />
              Start Timer!
            </button>
          </div>
        )}

        {/* Active — Timer running */}
        {round.status === 'active' && (
          <div className="text-center w-full">
            {/* Timer */}
            <div className="mb-8">
              <div
                className="text-[8rem] lg:text-[12rem] font-display font-black leading-none transition-colors duration-500"
                style={{ color: timerColor }}
              >
                {formatTime(elapsed)}
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xl mx-auto h-3 bg-white/10 rounded-full overflow-hidden mt-4">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min((elapsed / maxTime) * 100, 100)}%`,
                    backgroundColor: timerColor,
                  }}
                />
              </div>
            </div>

            {/* Team info */}
            <div className="mb-8">
              <div className="inline-block px-6 py-2 rounded-full" style={{ backgroundColor: activeTeam?.color + '30' }}>
                <span className="font-bold text-lg" style={{ color: activeTeam?.color }}>
                  {activeTeam?.name}
                </span>
                <span className="text-white/40 mx-2">—</span>
                <span className="text-white/60">GUESSING...</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleCorrect}
                className="px-10 py-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-3xl rounded-3xl
                           hover:from-emerald-500 hover:to-emerald-400 active:scale-95 transition-all duration-200
                           shadow-2xl shadow-emerald-500/30 flex items-center gap-3"
              >
                <Check className="w-8 h-8" strokeWidth={3} />
                CORRECT!
              </button>
              <button
                onClick={handleSkip}
                className="px-6 py-6 bg-white/10 hover:bg-white/20 text-white/60 font-bold text-lg rounded-3xl
                           transition-all active:scale-95 flex items-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
