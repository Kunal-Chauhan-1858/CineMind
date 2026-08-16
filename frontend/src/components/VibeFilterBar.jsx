import React from 'react';
import { Flame, Sparkles, Zap, Heart, Moon, Brain, Compass, Star } from 'lucide-react';
import { useMovies } from '../context/MovieContext';

const VIBES = [
  { name: 'Any Vibe', icon: Compass, color: 'from-slate-700 to-slate-800' },
  { name: 'Mind-Bending', icon: Brain, color: 'from-violet-600 to-indigo-600' },
  { name: 'Adrenaline Rush', icon: Zap, color: 'from-amber-500 to-orange-600' },
  { name: 'Dark & Gritty', icon: Moon, color: 'from-slate-900 to-zinc-800' },
  { name: 'Feel-Good', icon: Heart, color: 'from-pink-500 to-rose-600' },
  { name: 'Thought-Provoking', icon: Sparkles, color: 'from-cyan-500 to-blue-600' },
  { name: 'Cyberpunk', icon: Flame, color: 'from-emerald-500 to-teal-700' },
  // Previously there was no way to filter the mood row for Hindi/South
  // Indian cinema at all -- only the Discover page's genre chips reached
  // it. This makes Bollywood a real mood option everywhere the vibe
  // filter is used (Home page + Movie Assistant), not just Discover.
  { name: 'Bollywood', icon: Star, color: 'from-orange-500 to-rose-600' },
];

export default function VibeFilterBar({ onVibeChange }) {
  const { activeVibe, setActiveVibe } = useMovies();

  const handleSelect = (vibeName) => {
    setActiveVibe(vibeName);
    if (onVibeChange) onVibeChange(vibeName);
  };

  return (
    <div className="w-full overflow-x-auto py-3 no-scrollbar">
      <div className="flex items-center gap-2.5 min-w-max px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mr-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" /> Current Vibe:
        </span>

        {VIBES.map((item) => {
          const Icon = item.icon;
          const isSelected = (activeVibe || '').toLowerCase() === item.name.toLowerCase();

          return (
            <button
              key={item.name}
              onClick={() => handleSelect(item.name)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                isSelected
                  ? `bg-gradient-to-r ${item.color} !text-white shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400 scale-105`
                  : 'bg-slate-200/90 dark:bg-slate-900/60 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? '!text-white' : 'text-cyan-500'}`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
