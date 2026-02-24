import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Users, Zap, QrCode } from 'lucide-react';
import api from '../utils/api';
import { getOrCreateSessionKey } from '../utils/constants';

export default function Home() {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null); // 'create' | 'join'

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const sessionKey = getOrCreateSessionKey();
      const res = await api.createGame(hostName.trim());
      localStorage.setItem('game001_player_id', res.player_id);
      localStorage.setItem('game001_session', sessionKey);
      navigate(`/game/${res.code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigate(`/join/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-4 shadow-lg shadow-blue-500/25">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-display font-black text-white tracking-tight">
            001 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Game</span>
          </h1>
          <p className="text-white/50 mt-2 text-lg">Act it out. Guess it fast.</p>
        </div>

        {/* Mode selection */}
        {!mode && (
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={() => setMode('create')}
              className="w-full card hover:bg-white/10 transition-all duration-200 flex items-center gap-4 cursor-pointer group"
            >
              <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <Zap className="w-7 h-7 text-blue-400" />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-white">Create Game</div>
                <div className="text-sm text-white/50">Host a new game on the big screen</div>
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full card hover:bg-white/10 transition-all duration-200 flex items-center gap-4 cursor-pointer group"
            >
              <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <Users className="w-7 h-7 text-purple-400" />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-white">Join Game</div>
                <div className="text-sm text-white/50">Enter a game code to join</div>
              </div>
            </button>

            <div className="text-center pt-4">
              <div className="flex items-center gap-2 justify-center text-white/30 text-sm">
                <QrCode className="w-4 h-4" />
                <span>Or scan a QR code to join instantly</span>
              </div>
            </div>
          </div>
        )}

        {/* Create form */}
        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4 animate-slide-up">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Create a New Game</h2>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Your name (host)"
                className="input-field"
                maxLength={50}
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading || !hostName.trim()} className="btn-primary w-full text-lg py-4">
              {loading ? 'Creating...' : 'Create Game'}
            </button>
            <button type="button" onClick={() => { setMode(null); setError(''); }} className="btn-ghost w-full">
              Back
            </button>
          </form>
        )}

        {/* Join form */}
        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4 animate-slide-up">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Join a Game</h2>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Game code (e.g. ABC123)"
                className="input-field text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                autoFocus
              />
            </div>
            <button type="submit" disabled={joinCode.length < 4} className="btn-primary w-full text-lg py-4">
              Join Game
            </button>
            <button type="button" onClick={() => { setMode(null); setError(''); }} className="btn-ghost w-full">
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
