import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GameProvider, useGame } from '../contexts/GameContext';
import HostLobby from '../components/HostLobby';
import HostGame from '../components/HostGame';
import HostScoreboard from '../components/HostScoreboard';
import { Wifi, WifiOff } from 'lucide-react';

function HostViewInner() {
  const { gameState, connected } = useGame();

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-lg">Connecting to game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 relative">
      {/* Connection indicator */}
      <div className="fixed top-4 right-4 z-50">
        {connected ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Live</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full animate-pulse">
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-400 font-medium">Reconnecting...</span>
          </div>
        )}
      </div>

      {gameState.status === 'lobby' && <HostLobby />}
      {gameState.status === 'in_progress' && <HostGame />}
      {gameState.status === 'finished' && <HostScoreboard />}
    </div>
  );
}

export default function HostView() {
  const { code } = useParams();

  return (
    <GameProvider gameCode={code}>
      <HostViewInner />
    </GameProvider>
  );
}
