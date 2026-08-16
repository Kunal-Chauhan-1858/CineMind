import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Sparkles, Filter, Loader2 } from 'lucide-react';
import MovieGrid from '../components/MovieGrid';
import LoadingSkeleton from '../components/LoadingSkeleton';
import apiClient from '../api/client';

const TMDB_SORT_MAP = {
  cineverse_score: 'vote_average.desc',
  imdb_rating: 'vote_average.desc',
  release_year: 'primary_release_date.desc',
};

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('cineverse_score');
  const [genresList, setGenresList] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live TMDb catalog paging — active whenever the user isn't running a
  // free-text search (TMDb's /discover endpoint filters by genre/sort, not
  // arbitrary text; free-text search stays scoped to the local catalog).
  const [tmdbPage, setTmdbPage] = useState(0);
  const [tmdbTotalPages, setTmdbTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tmdbUnavailable, setTmdbUnavailable] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    fetchMovies();
    setTmdbPage(0);
    setTmdbTotalPages(1);
    setTmdbUnavailable(false);
  }, [query, selectedGenre, minRating, sortBy]);

  const fetchGenres = async () => {
    try {
      const res = await apiClient.get('/movies/genres');
      setGenresList(['All', ...res.data]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/movies', {
        params: {
          q: query,
          genre: selectedGenre,
          min_rating: minRating,
          sort_by: sortBy
        }
      });
      setMovies(res.data);
    } catch (err) {
      console.error("Error fetching discover movies", err);
      setError("Couldn't load movies right now.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreFromTmdb = async () => {
    setLoadingMore(true);
    try {
      const nextPage = tmdbPage + 1;
      const res = await apiClient.get('/movies/discover', {
        params: {
          page: nextPage,
          genre: selectedGenre === 'All' ? undefined : selectedGenre,
          sort_by: TMDB_SORT_MAP[sortBy] || 'popularity.desc',
        }
      });
      setMovies(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const fresh = res.data.movies.filter(m => !existingIds.has(m.id));
        return [...prev, ...fresh];
      });
      setTmdbPage(res.data.page);
      setTmdbTotalPages(res.data.total_pages);
    } catch (err) {
      console.error("Error loading more movies from TMDb", err);
      if (err?.response?.status === 503) setTmdbUnavailable(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const canBrowseMore = !query.trim() && !tmdbUnavailable && tmdbPage > 0 && tmdbPage < tmdbTotalPages;
  const canStartTmdbBrowse = !query.trim() && !tmdbUnavailable && tmdbPage === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-2xl sm:text-4xl text-slate-900 dark:text-white mb-2">
          Discover & Semantic Search
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Search by film title, director, theme, or natural language prompt.
        </p>
      </div>

      {/* Filter & Controls Panel */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchParams({ q: e.target.value });
            }}
            placeholder="Type anything (e.g. Christopher Nolan space travel)..."
            className="w-full pl-12 pr-4 py-3 text-sm rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          
          {/* Genre Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {genresList.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                  selectedGenre === g
                    ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="cineverse_score">CineMind Score</option>
              <option value="imdb_rating">IMDb Rating</option>
              <option value="release_year">Release Year</option>
            </select>
          </div>

        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>Showing {movies.length} cinema entries</span>
        {query && (
          <span>
            Search query: <span className="text-cyan-400 font-semibold">"{query}"</span>
          </span>
        )}
      </div>

      {/* Movies Grid — with a real error state + retry, instead of a
          silently blank grid on a failed fetch. */}
      {error ? (
        <div className="py-16 text-center space-y-3">
          <p className="text-sm text-rose-400 font-semibold">{error}</p>
          <button
            onClick={fetchMovies}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <LoadingSkeleton count={10} />
      ) : (
        <MovieGrid movies={movies} />
      )}

      {/* Live TMDb catalog paging — only offered outside free-text search */}
      {!loading && canBrowseMore && (
        <div className="flex flex-col items-center gap-2 pt-4">
          <button
            onClick={loadMoreFromTmdb}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-black font-extrabold text-sm shadow-lg shadow-cyan-500/20 transition-all"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Loading more titles…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Load More Movies
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">
            Browsing TMDb's live catalog — page {tmdbPage} of {tmdbTotalPages}
          </p>
        </div>
      )}

      {!loading && canStartTmdbBrowse && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMoreFromTmdb}
            disabled={loadingMore}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            Not seeing enough movies? Browse TMDb's full catalog →
          </button>
        </div>
      )}

      {tmdbUnavailable && !query && (
        <p className="text-center text-[11px] text-amber-600 dark:text-amber-400">
          Live catalog browsing needs a TMDB_API_KEY configured on the server.
        </p>
      )}
    </div>
  );
}
