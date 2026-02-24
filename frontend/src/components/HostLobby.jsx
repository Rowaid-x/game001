import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useGame } from '../contexts/GameContext';
import { getBaseUrl } from '../utils/constants';
import { Users, Settings, Play, ChevronRight, Palette, ArrowRightLeft } from 'lucide-react';
import api from '../utils/api';
import CategoryPicker from './CategoryPicker';

export default function HostLobby() {
  const { gameState, assignPlayer, updateTeam, startGame, updateSettings } = useGame();
  const [categories, setCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');

  const joinUrl = `${getBaseUrl()}/join/${gameState.code}`;

  useEffect(() => {
    api.getCategories().then((res) => {
      const cats = res.results || res;
      setCategories(cats);
      setSelectedCats(cats.map((c) => c.id));
    }).catch(() => {});
  }, []);

  const handleAssign = (playerId, teamId) => {
    assignPlayer(playerId, teamId);
  };

  const handleStart = () => {
    setError('');
    const teams = gameState.teams || [];
    for (const team of teams) {
      if (!team.players || team.players.length < 1) {
        setError(`${team.name} needs at least 1 player`);
        return;
      }
    }
    if (selectedCats.length > 0) {
      updateSettings({ category_ids: selectedCats });
    }
    setTimeout(() => startGame(), 300);
  };

  const handleTeamNameChange = (teamId, name) => {
    updateTeam(teamId, name, null);
  };

  const totalPlayers = (gameState.teams || []).reduce((sum, t) => sum + (t.players?.length || 0), 0)
    + (gameState.unassigned_players?.length || 0);

  return (
    <div className="min-h-screen p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl lg:text-5xl font-display font-black text-white">
            001 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Game</span>
          </h1>
          <p className="text-white/40 mt-1">Waiting for players to join...</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn-ghost flex items-center gap-2"
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* QR Code + Game Code */}
        <div className="card flex flex-col items-center text-center">
          <h2 className="text-lg font-bold text-white/60 mb-4">Scan to Join</h2>
          <div className="bg-white p-4 rounded-2xl mb-4">
            <QRCodeSVG value={joinUrl} size={200} level="M" />
          </div>
          <div className="text-5xl font-mono font-black text-white tracking-[0.3em] mb-2">
            {gameState.code}
          </div>
          <p className="text-white/30 text-sm">{joinUrl}</p>
          <div className="mt-4 flex items-center gap-2 text-white/50">
            <Users className="w-4 h-4" />
            <span>{totalPlayers} player{totalPlayers !== 1 ? 's' : ''} joined</span>
          </div>
        </div>

        {/* Teams */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gameState.teams?.map((team) => (
              <div
                key={team.id}
                className="card"
                style={{ borderColor: team.color + '40' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                    <input
                      type="text"
                      defaultValue={team.name}
                      onBlur={(e) => handleTeamNameChange(team.id, e.target.value)}
                      className="bg-transparent text-xl font-bold text-white border-none outline-none focus:ring-0 w-40"
                    />
                  </div>
                  <span className="text-white/30 text-sm">{team.players?.length || 0} players</span>
                </div>

                <div className="space-y-2 min-h-[80px]">
                  {team.players?.map((player) => (
                    <div key={player.id} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl">
                      <span className="text-white font-medium">{player.name}</span>
                      {player.is_host && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full">Host</span>
                      )}
                    </div>
                  ))}
                  {(!team.players || team.players.length === 0) && (
                    <div className="text-center py-6 text-white/20 text-sm">
                      No players yet
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Unassigned players */}
          {gameState.unassigned_players?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold text-white/60 mb-3">
                <ArrowRightLeft className="w-4 h-4 inline mr-2" />
                Unassigned Players — Tap to assign
              </h3>
              <div className="flex flex-wrap gap-2">
                {gameState.unassigned_players.map((player) => (
                  <div key={player.id} className="flex items-center gap-1">
                    <span className="px-3 py-2 bg-white/10 rounded-l-xl text-white font-medium text-sm">
                      {player.name}
                    </span>
                    {gameState.teams?.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => handleAssign(player.id, team.id)}
                        className="px-3 py-2 text-white text-xs font-bold rounded-r-xl hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: team.color }}
                        title={`Assign to ${team.name}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings panel */}
          {showSettings && (
            <div className="card animate-slide-up">
              <h3 className="text-lg font-bold text-white mb-4">Game Settings</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-white/50 block mb-1">Total Rounds</label>
                  <input
                    type="number"
                    defaultValue={gameState.total_rounds}
                    min={1}
                    max={50}
                    onBlur={(e) => updateSettings({ total_rounds: parseInt(e.target.value) || 10 })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/50 block mb-1">Time per Turn (sec)</label>
                  <input
                    type="number"
                    defaultValue={gameState.max_time_per_turn}
                    min={30}
                    max={600}
                    step={30}
                    onBlur={(e) => updateSettings({ max_time_per_turn: parseInt(e.target.value) || 240 })}
                    className="input-field"
                  />
                </div>
              </div>

              <h4 className="text-sm font-bold text-white/60 mb-3">Categories</h4>
              <CategoryPicker
                categories={categories}
                selected={selectedCats}
                onChange={setSelectedCats}
              />
            </div>
          )}

          {/* Start button */}
          <div className="pt-4">
            {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
            <button
              onClick={handleStart}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-2xl rounded-2xl
                         hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] transition-all duration-200
                         shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-3"
            >
              <Play className="w-7 h-7" />
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
