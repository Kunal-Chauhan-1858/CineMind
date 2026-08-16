import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, Star, Sparkles, Film, User, Settings, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import TasteAnalyticsChart from '../components/TasteAnalyticsChart';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL_MS = 60 * 1000;

export default function Dashboard() {
  const { user, updatePreferences } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [prefGenres, setPrefGenres] = useState(user?.preferred_genres || ['Sci-Fi', 'Action']);

  // Previously this only fetched once on mount, so rating a movie through a
  // modal opened without leaving /dashboard never showed up here until a
  // manual page reload. Now: poll every 60s while mounted, refetch on window
  // focus, and expose a manual refresh button -- all sharing one fetch
  // function, distinguished by whether it's a "background" refresh (silent
  // failure, keeps the last good view) or a manual/initial one (shows a
  // real error state on failure).
  const isFirstLoad = useRef(true);

  const fetchAnalytics = useCallback(async ({ manual = false } = {}) => {
    if (isFirstLoad.current) {
      setLoading(true);
    }
    setRefreshing(true);
    try {
      const res = await apiClient.get('/analytics/user');
      setAnalytics(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error(err);
      // A failed automatic/background refresh should never blow away an
      // already-good view with an error state -- only a failed *manual*
      // refresh (or the very first load) should show one.
      if (manual || isFirstLoad.current) {
        setError('Could not load your analytics. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();

    const intervalId = setInterval(() => fetchAnalytics(), POLL_INTERVAL_MS);
    const onFocus = () => fetchAnalytics();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchAnalytics]);

  const handleManualRefresh = () => fetchAnalytics({ manual: true });

  const toggleGenrePref = (genre) => {
    let updated;
    if (prefGenres.includes(genre)) {
      updated = prefGenres.filter(g => g !== genre);
    } else {
      updated = [...prefGenres, genre];
    }
    setPrefGenres(updated);
    updatePreferences({ preferred_genres: updated });
  };

  const ALL_GENRES = ["Sci-Fi", "Action", "Thriller", "Drama", "Comedy", "Animation", "Horror", "Crime", "Adventure"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-4xl text-slate-900 dark:text-white mb-1">
            Taste Analytics Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Built from what you've rated, watchlisted, and liked — the more you interact, the more accurate this gets.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              aria-label="Refresh analytics"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {lastUpdated && (
              <span className="text-[11px] text-slate-500">
                Updated {lastUpdated.getHours().toString().padStart(2, '0')}:{lastUpdated.getMinutes().toString().padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 glass-panel px-4 py-2 rounded-2xl border border-slate-800">
          <img src={user?.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-cyan-400/40 object-cover" />
          <div>
            <p className="text-xs font-bold text-white">{user?.username}</p>
            <p className="text-[10px] text-cyan-400 font-semibold">{user?.preferred_vibes?.[0] ? `${user.preferred_vibes[0]} Cinephile` : "Cinephile"}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
          <button
            onClick={handleManualRefresh}
            className="text-xs font-bold text-rose-300 hover:text-rose-200 underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-1">
          <p className="text-xs font-semibold text-slate-400">Films Rated</p>
          <p className="font-display font-extrabold text-3xl text-white">{analytics?.total_rated ?? 0}</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-1">
          <p className="text-xs font-semibold text-slate-400">Average Rating</p>
          <p className="font-display font-extrabold text-3xl text-amber-400 flex items-center gap-1">
            <Star className="w-6 h-6 fill-amber-400" /> {analytics?.average_rating ? analytics.average_rating : '—'}
          </p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-1">
          <p className="text-xs font-semibold text-slate-400">Dominant Vibe</p>
          <p className="font-display font-extrabold text-xl text-cyan-400 truncate">{analytics?.top_vibe || '—'}</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-1">
          <p className="text-xs font-semibold text-slate-400">Favorite Era</p>
          <p className="font-display font-extrabold text-3xl text-violet-400">{analytics?.favorite_era || '—'}</p>
        </div>
      </div>

      {/* Interactive Charts — or an honest empty state if the user hasn't
          rated/watchlisted/favorited anything yet. Previously this always
          rendered charts full of fabricated or catalog-wide numbers even
          for a brand-new account. */}
      {analytics && analytics.total_rated === 0 && Object.keys(analytics.genre_distribution).length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl border border-slate-800 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-cyan-400 mx-auto" />
          <p className="text-sm font-bold text-white">Not enough data yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Rate a few movies, add some to your watchlist, or like a few titles — your taste profile will build up here automatically.
          </p>
        </div>
      ) : (
        analytics && <TasteAnalyticsChart data={analytics} />
      )}

      {/* Preferred Genres Customizer */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <h3 className="font-display font-bold text-base text-white">Customize Recommendation Preferences</h3>
        </div>
        <p className="text-xs text-slate-400">Select genres to train the hybrid recommendation vector engine in real-time:</p>
        
        <div className="flex flex-wrap gap-2 pt-2">
          {ALL_GENRES.map((genre) => {
            const isSelected = prefGenres.includes(genre);
            return (
              <button
                key={genre}
                onClick={() => toggleGenrePref(genre)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                {genre}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
