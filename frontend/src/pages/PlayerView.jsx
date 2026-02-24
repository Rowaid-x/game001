import React from 'react';
import { useParams } from 'react-router-dom';
import { GameProvider, useGame } from '../contexts/GameContext';
import { Wifi, WifiOff, Clock, Users, Trophy } from 'lucide-react';

function PlayerViewInner() {
  const { gameState, connected } = useGame();
  const playerId = localStorage.getItem('game001_player_id');
  const playerName = localStorage.getItem('game001_player_name');

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Connecting...</p>
        </div>
      </div>
    );
  }

  const myTeam = gameState.teams?.find((t) =>
    t.players?.some((p) => p.id === playerId)
  );

  const round = gameState.round;
  const isMyTeamTurn = round && myTeam && round.team_id === myTeam.id;
  const isActor = round && round.actor_id === playerId;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">{playerName || 'Player'}</h2>
          {myTeam && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: myTeam.color }} />
              <span className="text-sm text-white/60">{myTeam.name}</span>
            </div>
          )}
        </div>
        <div>
          {connected ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
          )}
        </div>
      </div>

      {/* Lobby state */}
      {gameState.status === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Waiting for Host</h3>
          <p className="text-white/50">The host will start the game soon...</p>
          {myTeam ? (
            <div className="mt-6 px-4 py-2 rounded-xl" style={{ backgroundColor: myTeam.color + '30', border: `1px solid ${myTeam.color}50` }}>
              <span className="text-white/80 text-sm">You're on </span>
              <span className="font-bold text-white">{myTeam.name}</span>
            </div>
          ) : (
            <div className="mt-6 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
              <span className="text-yellow-300 text-sm">Waiting to be assigned to a team...</span>
            </div>
          )}

          {/* Scores */}
          <div className="mt-8 w-full max-w-xs space-y-2">
            {gameState.teams?.map((team) => (
              <div key={team.id} className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="text-white/80 text-sm font-medium">{team.name}</span>
                </div>
                <span className="text-white/40 text-sm">{team.players?.length || 0} players</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-progress state */}
      {gameState.status === 'in_progress' && round && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Round info */}
          <div className="text-white/40 text-sm mb-2">
            Round {gameState.current_round} of {gameState.total_rounds}
          </div>

          {isActor ? (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-4xl">🎭</span>
              </div>
              <h3 className="text-2xl font-bold text-yellow-300">You're Acting!</h3>
              <p className="text-white/50">Look at the big screen for your QR code</p>
            </div>
          ) : isMyTeamTurn ? (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-4xl">🤔</span>
              </div>
              <h3 className="text-2xl font-bold text-emerald-300">Your Team's Turn!</h3>
              <p className="text-white/50">
                {round.status === 'active'
                  ? 'Watch the actor and guess!'
                  : round.status === 'selecting_actor'
                  ? 'Select who will act...'
                  : round.status === 'selecting_category'
                  ? 'Choosing category...'
                  : round.status === 'showing_qr' || round.status === 'actor_ready'
                  ? 'Actor is getting ready...'
                  : 'Waiting...'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
                <Clock className="w-10 h-10 text-white/40" />
              </div>
              <h3 className="text-xl font-bold text-white/60">Other Team's Turn</h3>
              <p className="text-white/40">Watch and wait for your turn</p>
            </div>
          )}

          {/* Live scores */}
          <div className="mt-8 w-full max-w-xs space-y-2">
            {gameState.teams?.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                style={{
                  backgroundColor: round.team_id === team.id ? team.color + '20' : 'rgba(255,255,255,0.05)',
                  border: round.team_id === team.id ? `1px solid ${team.color}40` : '1px solid transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="text-white font-medium text-sm">{team.name}</span>
                </div>
                <span className="text-white font-bold">{team.total_score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finished state */}
      {gameState.status === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Trophy className="w-16 h-16 text-yellow-400 mb-4" />
          <h3 className="text-3xl font-bold text-white mb-6">Game Over!</h3>
          <div className="w-full max-w-xs space-y-3">
            {gameState.teams
              ?.sort((a, b) => b.total_score - a.total_score)
              .map((team, i) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between px-5 py-4 rounded-2xl"
                  style={{
                    backgroundColor: team.color + (i === 0 ? '30' : '15'),
                    border: `1px solid ${team.color}${i === 0 ? '60' : '30'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{i === 0 ? '🏆' : '🥈'}</span>
                    <span className="text-white font-bold">{team.name}</span>
                  </div>
                  <span className="text-white font-black text-xl">{team.total_score}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayerView() {
  const { code } = useParams();

  return (
    <GameProvider gameCode={code}>
      <PlayerViewInner />
    </GameProvider>
  );
}
