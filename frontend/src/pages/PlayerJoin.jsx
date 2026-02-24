import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserPlus, Gamepad2 } from 'lucide-react';
import api from '../utils/api';
import { getOrCreateSessionKey } from '../utils/constants';

export default function PlayerJoin() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const sessionKey = getOrCreateSessionKey();
      const res = await api.joinGame(code, name.trim(), sessionKey);
      localStorage.setItem('game001_player_id', res.player_id);
      localStorage.setItem('game001_player_name', res.player_name);
      navigate(`/play/${code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-3 shadow-lg shadow-purple-500/25">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-black text-white">Join Game</h1>
          <div className="mt-2 inline-block px-4 py-1.5 bg-white/10 rounded-full">
            <span className="text-white/60 text-sm">Game Code: </span>
            <span className="text-white font-mono font-bold text-lg tracking-wider">{code?.toUpperCase()}</span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="card">
            <label className="block text-sm font-medium text-white/60 mb-2">What's your name?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="input-field text-lg"
              maxLength={50}
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}
