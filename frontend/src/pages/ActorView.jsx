import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Eye, Hand, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function ActorView() {
  const { roundId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function fetchPrompt() {
      try {
        const data = await api.getPrompt(roundId, token);
        setPrompt(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPrompt();
  }, [roundId, token]);

  const handleReady = async () => {
    try {
      await api.actorReady(roundId);
      setReady(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-white/60">Loading your prompt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="card text-center max-w-sm">
          <div className="text-4xl mb-3">🚫</div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  if (ready) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center animate-bounce-in">
          <div className="text-6xl mb-4">🎭</div>
          <h2 className="text-3xl font-black text-white mb-2">Go Act!</h2>
          <p className="text-white/50 text-lg">Put your phone down and start acting!</p>
          <p className="text-white/30 text-sm mt-4">Remember: No talking, only gestures!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Category badge */}
      <div className="p-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
          <span>{prompt.category_icon}</span>
          <span className="text-white/70 text-sm font-medium">{prompt.category}</span>
        </div>
        <div className="text-white/30 text-xs mt-1">Round {prompt.round_number}</div>
      </div>

      {/* Prompt image */}
      <div className="flex-1 flex items-center justify-center p-4">
        {prompt.image_url ? (
          <div className="w-full max-w-sm">
            <img
              src={prompt.image_url}
              alt="Act this out"
              className="w-full rounded-2xl shadow-2xl object-cover"
              loading="eager"
            />
          </div>
        ) : (
          <div className="w-full max-w-sm aspect-square bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
            <Eye className="w-16 h-16 text-white/20" />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="px-4 text-center">
        <h1 className="text-3xl font-black text-white mb-1">{prompt.title}</h1>
        {prompt.title_ar && (
          <p className="text-xl text-white/60 font-arabic" dir="rtl">{prompt.title_ar}</p>
        )}
      </div>

      {/* Ready button */}
      <div className="p-6">
        <button
          onClick={handleReady}
          className="w-full py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-xl rounded-2xl
                     hover:from-emerald-500 hover:to-emerald-400 active:scale-95 transition-all duration-200
                     shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-3"
        >
          <Hand className="w-6 h-6" />
          Ready to Act!
        </button>
        <p className="text-center text-white/30 text-xs mt-3">
          Memorize the prompt, then tap ready and put your phone away
        </p>
      </div>
    </div>
  );
}
