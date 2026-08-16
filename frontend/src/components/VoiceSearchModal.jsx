import React, { useState, useEffect } from 'react';
import { Mic, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMovies } from '../context/MovieContext';

export default function VoiceSearchModal() {
  const { voiceSearchOpen, setVoiceSearchOpen } = useMovies();
  const [transcript, setTranscript] = useState('Listening... Speak your movie vibe or title');
  const [isListening, setIsListening] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (voiceSearchOpen) {
      setIsListening(true);
      const timer = setTimeout(() => {
        setTranscript('Mind-bending sci-fi thriller like Interstellar');
        setIsListening(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [voiceSearchOpen]);

  if (!voiceSearchOpen) return null;

  const handleApplyVoiceQuery = () => {
    setVoiceSearchOpen(false);
    navigate(`/discover?q=${encodeURIComponent(transcript)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-8 border border-cyan-500/30 text-center space-y-6">
        
        <button
          onClick={() => setVoiceSearchOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all ${
            isListening
              ? 'bg-cyan-500/20 border-cyan-400 shadow-2xl shadow-cyan-500/50 animate-pulse'
              : 'bg-violet-500/20 border-violet-400 shadow-2xl shadow-violet-500/50'
          }`}>
            <Mic className={`w-8 h-8 ${isListening ? 'text-cyan-400 animate-bounce' : 'text-violet-400'}`} />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> CineMind Voice Search
          </span>

          <p className="text-sm font-medium text-slate-200 italic px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 w-full">
            "{transcript}"
          </p>
        </div>

        {!isListening && (
          <button
            onClick={handleApplyVoiceQuery}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all"
          >
            Search Movies with Voice Prompt
          </button>
        )}
      </div>
    </div>
  );
}
