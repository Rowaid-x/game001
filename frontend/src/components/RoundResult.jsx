import React from 'react';
import { ChevronRight, Clock, Trophy, XCircle, SkipForward } from 'lucide-react';

export default function RoundResult({ result, round, gameState, onNext }) {
  const isGuessed = result.status === 'guessed';
  const isTimeout = result.status === 'timeout';
  const isSkipped = result.status === 'skipped';

  const activeTeam = gameState?.teams?.find((t) => t.id === round?.team_id);
  const isLastRound = gameState?.current_round >= gameState?.total_rounds;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 lg:p-10">
      {/* Result icon */}
      <div className="animate-bounce-in mb-6">
        {isGuessed && <span className="text-8xl">🎉</span>}
        {isTimeout && <span className="text-8xl">⏰</span>}
        {isSkipped && <span className="text-8xl">⏭️</span>}
      </div>

      {/* Result title */}
      <h1 className="text-5xl lg:text-6xl font-display font-black text-center mb-4 animate-slide-up">
        {isGuessed && <span className="text-emerald-400">CORRECT!</span>}
        {isTimeout && <span className="text-red-400">TIME'S UP!</span>}
        {isSkipped && <span className="text-white/60">SKIPPED</span>}
      </h1>

      {/* Points */}
      {isGuessed && (
        <div className="text-center mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-white/50" />
            <span className="text-white/70 text-xl">{result.time_taken?.toFixed(1)} seconds</span>
          </div>
          <div className="text-6xl font-black text-yellow-400">
            +{result.points}
            <span className="text-2xl text-yellow-400/60 ml-2">pts</span>
          </div>
        </div>
      )}

      {/* Team score update */}
      <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-4">
          {gameState?.teams?.map((team) => (
            <div
              key={team.id}
              className="px-6 py-4 rounded-2xl text-center transition-all"
              style={{
                backgroundColor: team.color + '20',
                border: `2px solid ${team.color}50`,
                transform: team.id === round?.team_id && isGuessed ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <div className="text-white font-bold text-lg">{team.name}</div>
              <div className="text-3xl font-black text-white">{team.total_score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next round button */}
      <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <button
          onClick={onNext}
          className="px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black text-xl rounded-2xl
                     hover:from-blue-500 hover:to-blue-400 active:scale-95 transition-all duration-200
                     shadow-lg shadow-blue-500/25 flex items-center gap-3"
        >
          {isLastRound ? (
            <>
              <Trophy className="w-6 h-6" />
              See Final Results
            </>
          ) : (
            <>
              Next Round
              <ChevronRight className="w-6 h-6" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
