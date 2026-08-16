import React, { useState } from 'react';
import { Bookmark, CheckCircle2, Clock, Trash2, Play, Star, AlertTriangle } from 'lucide-react';
import { useMovies } from '../context/MovieContext';

const STATUS_SEGMENTS = [
  { id: 'want_to_watch', label: 'Want to Watch', icon: Bookmark },
  { id: 'watching', label: 'Currently Watching', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export default function WatchlistPage() {
  const { watchlist, watchlistError, fetchWatchlist, updateWatchlistStatus, removeFromWatchlist, setTrailerMovie, setSelectedMovie } = useMovies();
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredItems = watchlist.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  }).filter(item => item.movie);

  const TABS = [
    { id: 'all', label: 'All Items', count: watchlist.length },
    { id: 'want_to_watch', label: 'Want to Watch', count: watchlist.filter(w => w.status === 'want_to_watch').length },
    { id: 'watching', label: 'Currently Watching', count: watchlist.filter(w => w.status === 'watching').length },
    { id: 'completed', label: 'Completed', count: watchlist.filter(w => w.status === 'completed').length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-black text-2xl sm:text-4xl text-slate-900 dark:text-white mb-1">
          My Watchlist & Library
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Track and organize films you intend to watch or have finished.
        </p>
      </div>

      {/* Error state -- fetchWatchlist previously only logged failures to
          the console, leaving the page looking permanently empty. */}
      {watchlistError && (
        <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {watchlistError}
          </div>
          <button
            onClick={fetchWatchlist}
            className="text-xs font-bold text-rose-300 hover:text-rose-200 underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterStatus === tab.id
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === tab.id ? 'bg-black text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Watchlist item list — gives explicit per-item status changes and
          a real remove action (previously nothing on this page could
          actually remove an item or move it between statuses). */}
      {filteredItems.length === 0 ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400 text-sm">
          Your watchlist is empty. Explore movies and click "Add to Watchlist"!
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map(item => {
            const movie = item.movie;
            return (
              <div
                key={item.movie_id}
                className="flex items-center gap-3 p-2.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/40 transition-colors"
              >
                <img
                  src={movie.poster_path}
                  alt={movie.title}
                  onClick={() => setSelectedMovie(movie)}
                  className="w-12 h-[72px] object-cover rounded-lg cursor-pointer shrink-0 bg-slate-900"
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedMovie(movie)}>
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{movie.title}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{movie.release_year}</span>
                    <span className="flex items-center gap-0.5 text-amber-500"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{movie.imdb_rating}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setTrailerMovie(movie)}
                    aria-label="Watch trailer"
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-black text-slate-500 dark:text-slate-300 transition-colors"
                    title="Watch Trailer"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  {/* Real 3-way status control -- previously nothing on
                      this page ever set status: 'watching', so the
                      "Currently Watching" tab was permanently empty. Each
                      segment calls the existing updateWatchlistStatus. */}
                  <div className="flex items-center rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                    {STATUS_SEGMENTS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => updateWatchlistStatus(movie.id, id)}
                        aria-label={`Mark as ${label}`}
                        title={label}
                        className={`p-2 transition-colors ${
                          item.status === id
                            ? 'bg-cyan-500 text-black'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => removeFromWatchlist(movie.id)}
                    aria-label="Remove from watchlist"
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 dark:text-slate-300 transition-colors"
                    title="Remove from Watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
