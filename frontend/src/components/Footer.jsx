import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="w-full glass-panel border-t border-slate-200 dark:border-slate-800/80 mt-16 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-[2px]">
            <div className="w-full h-full bg-white dark:bg-cineverse-dark rounded-[10px] flex items-center justify-center">
              <Logo className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="font-display font-extrabold text-lg text-white">
              Cine<span className="gradient-text">Mind</span>
            </span>
            <p className="text-xs text-slate-400">Simple, smart movie recommendations</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400">
          <span>FastAPI</span> • <span>React 18</span> • <span>Hybrid Scorer</span> • <span>Movie Assistant</span>
        </div>

        <div className="text-xs text-slate-500 flex flex-col items-center md:items-end gap-1.5">
          <div className="flex items-center gap-4">
            <Link to="/support" className="hover:text-cyan-400 transition-colors">Support</Link>
            <Link to="/privacy" className="hover:text-cyan-400 transition-colors">Privacy</Link>
          </div>
          <div className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for film lovers worldwide.
          </div>
          <p className="max-w-xs text-center md:text-right text-slate-500">
            This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data and images courtesy of TMDB.
          </p>
        </div>

      </div>
    </footer>
  );
}
