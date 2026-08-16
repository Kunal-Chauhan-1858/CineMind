import React, { useState } from 'react';
import { Play, Plus, Check, Star, Sparkles, Info, ShieldCheck, Heart } from 'lucide-react';
import { useMovies } from '../context/MovieContext';

// Local bundled fallback — see the matching comment in MovieDetailsModal.jsx.
const DEFAULT_SPOTLIGHT_BACKDROP = "/fallback-poster.svg";

export default function HeroSpotlight({ movie }) {
  const { setSelectedMovie, setTrailerMovie, toggleWatchlist, getWatchlistStatus, toggleFavorite, isFavorite } = useMovies();
  const [bgError, setBgError] = useState(false);

  if (!movie) return null;

  const watchlistStatus = getWatchlistStatus(movie.id);
  const favorited = isFavorite(movie.id);
  const backdropUrl = bgError ? DEFAULT_SPOTLIGHT_BACKDROP : (movie.backdrop_path || movie.poster_path || DEFAULT_SPOTLIGHT_BACKDROP);

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl mb-8 group bg-slate-950 media-overlay">
      {/* Background Image with Gradient Vignette */}
      <img
        src={backdropUrl}
        alt={movie.title}
        onError={() => setBgError(true)}
        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-1000 opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

      {/* Hero Content — Explicitly Styled Crisp White Text */}
      <div className="relative z-10 h-full max-w-3xl p-6 sm:p-10 flex flex-col justify-end gap-4">
        {/* Spotlight Pill */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-violet-600 !text-white shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5 !text-white" /> Spotlight Pick
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {movie.imdb_rating} IMDb
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> {movie.match_score || 99.4}% Match
          </span>
        </div>

        {/* Title & Tagline */}
        <div>
          <h1 className="font-display font-black text-3xl sm:text-5xl !text-white tracking-tight leading-none mb-2 drop-shadow-md">
            {movie.title}
          </h1>
          {movie.tagline && (
            <p className="text-sm sm:text-base text-cyan-300 font-medium italic">
              "{movie.tagline}"
            </p>
          )}
        </div>

        {/* Action Buttons — fixed height row so nothing shifts on click.
            flex-wrap + h-auto below sm so the row doesn't overflow at
            narrow widths (<400px) where 4 pill/icon buttons don't fit on
            one line. */}
        <div className="flex items-center flex-wrap gap-3 pt-2 sm:h-[46px]">
          <button
            onClick={() => setTrailerMovie(movie)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 !text-black font-extrabold text-sm shadow-xl shadow-cyan-500/30 hover:scale-105 transition-all"
          >
            <Play className="w-4 h-4 fill-black !text-black" /> Watch Trailer
          </button>

          <button
            onClick={() => toggleWatchlist(movie.id)}
            aria-label={watchlistStatus ? 'Remove from watchlist' : 'Add to watchlist'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
              watchlistStatus
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900 hover:bg-slate-800 !text-white border border-slate-700'
            }`}
          >
            {watchlistStatus ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
            {watchlistStatus ? 'In Watchlist' : 'Add to Watchlist'}
          </button>

          {/* Like/Favorite button — previously only available on MovieCard
              and the details modal; the banner had no way to like a movie
              at all. Same icon/behavior as everywhere else in the app. */}
          <button
            onClick={() => toggleFavorite(movie.id)}
            aria-label={favorited ? 'Remove from liked movies' : 'Like this movie'}
            className={`p-2.5 rounded-full border transition-colors shrink-0 ${
              favorited
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-slate-900 hover:bg-slate-800 !text-slate-200 hover:!text-white border-slate-700'
            }`}
            title={favorited ? 'Remove from Liked' : 'Like this movie'}
          >
            <Heart className={`w-5 h-5 ${favorited ? 'fill-rose-400' : ''}`} />
          </button>

          <button
            onClick={() => setSelectedMovie(movie)}
            aria-label="More details"
            className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 !text-slate-200 hover:!text-white border border-slate-700 transition-colors shrink-0"
            title="More Details"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
