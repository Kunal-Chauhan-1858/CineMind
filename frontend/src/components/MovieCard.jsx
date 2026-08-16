import React, { useState } from 'react';
import { Play, Plus, Check, Heart, Star, Sparkles, Film } from 'lucide-react';
import { useMovies } from '../context/MovieContext';

export default function MovieCard({ movie }) {
  const { setSelectedMovie, setTrailerMovie, toggleWatchlist, toggleFavorite, isFavorite, getWatchlistStatus } = useMovies();
  const [imgError, setImgError] = useState(false);

  if (!movie) return null;

  const fav = isFavorite(movie.id);
  const watchlistStatus = getWatchlistStatus(movie.id);
  const matchScore = movie.match_score || 92.0;

  return (
    <div className="group relative rounded-2xl overflow-hidden glass-panel border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col h-full cursor-pointer" onClick={() => setSelectedMovie(movie)}>
      {/* Poster Image Container — always dark, sits on artwork not the page */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900 media-overlay">
        {!imgError && movie.poster_path ? (
          <img
            src={movie.poster_path}
            alt={movie.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          /* High-Tech Custom Gradient Card Fallback */
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-cyan-950/60 to-violet-950/80 p-4 flex flex-col justify-between border border-cyan-500/20">
            <div className="flex justify-between items-start">
              <Film className="w-6 h-6 text-cyan-400" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {movie.release_year}
              </span>
            </div>
            <div className="space-y-1">
              <p className="font-display font-black text-sm text-white line-clamp-3 leading-tight">{movie.title}</p>
              <p className="text-[10px] text-cyan-400 font-semibold">{movie.genres && movie.genres.join(' • ')}</p>
            </div>
          </div>
        )}

        {/* Top Floating Match Badge */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-950/85 backdrop-blur text-cyan-400 border border-cyan-500/30 shadow-md">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>{matchScore}% Match</span>
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(movie.id); }}
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full backdrop-blur transition-all ${
            fav ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40' : 'bg-slate-950/60 text-slate-400 hover:text-white'
          }`}
          title={fav ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-rose-500' : ''}`} />
        </button>

        {/* Hover Overlay with Action Controls */}
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 z-20">
          <div>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold mb-1">
              <Star className="w-3.5 h-3.5 fill-amber-400" /> {movie.imdb_rating} / 10
            </div>
            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-2">
              {movie.overview}
            </p>
            {movie.recommendation_reason && (
              <p className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 p-2 rounded-xl italic">
                💡 {movie.recommendation_reason}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setTrailerMovie(movie)}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> Trailer
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => toggleWatchlist(movie.id)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                  watchlistStatus
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {watchlistStatus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
                {watchlistStatus ? 'In Watchlist' : 'Watchlist'}
              </button>

              <button
                onClick={() => setSelectedMovie(movie)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors"
              >
                Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3.5 pb-4 flex flex-col justify-between flex-1 gap-1">
        <h3 className="font-display font-bold text-sm text-white truncate group-hover:text-cyan-400 transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{movie.release_year} • {movie.runtime} min</span>
          <span className="text-cyan-400 font-medium truncate max-w-[90px]">
            {movie.genres && movie.genres[0]}
          </span>
        </div>
      </div>
    </div>
  );
}
