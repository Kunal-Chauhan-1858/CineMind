import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Plus, Check, Heart, Star, Sparkles, Tv, MessageSquare, Send, User, Film } from 'lucide-react';
import { useMovies } from '../context/MovieContext';
import apiClient from '../api/client';
import MovieCard from './MovieCard';
import useFocusTrap from '../hooks/useFocusTrap';

// Local bundled fallback (frontend/public/fallback-poster.svg) — doesn't
// depend on an external host being reachable, unlike a hotlinked photo.
// The backend has its own fallback (see FALLBACK_POSTER_URL in
// backend/app/services/tmdb.py) for records stored without real artwork;
// this is the client-side last resort if even that fails to load.
const FALLBACK_POSTER = "/fallback-poster.svg";

export default function MovieDetailsModal() {
  const { selectedMovie, setSelectedMovie, setTrailerMovie, toggleWatchlist, toggleFavorite, isFavorite, getWatchlistStatus } = useMovies();
  const [reviews, setReviews] = useState([]);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [userRating, setUserRating] = useState(5);
  const [spoilers, setSpoilers] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);
  const panelRef = useRef(null);
  useFocusTrap(panelRef, !!selectedMovie);

  useEffect(() => {
    if (selectedMovie) {
      fetchReviews(selectedMovie.id);
      fetchSimilar(selectedMovie.id);
    }
  }, [selectedMovie]);

  // Close on Escape + outside click, matching the same pattern used by the
  // trailer and auth modals.
  useEffect(() => {
    if (!selectedMovie) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedMovie(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedMovie, setSelectedMovie]);

  const fetchReviews = async (id) => {
    try {
      const res = await apiClient.get(`/interactions/reviews/movie/${id}`);
      setReviews(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSimilar = async (id) => {
    try {
      const res = await apiClient.get(`/movies/${id}/similar`);
      setSimilarMovies(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newReview.trim() || !selectedMovie) return;

    try {
      await apiClient.post('/interactions/reviews', {
        movie_id: selectedMovie.id,
        review_text: newReview,
        contains_spoilers: spoilers
      });
      setNewReview('');
      fetchReviews(selectedMovie.id);
    } catch (err) {
      console.error("Failed to post review", err);
    }
  };

  const handleRate = async (score) => {
    setUserRating(score);
    if (!selectedMovie) return;
    try {
      await apiClient.post('/interactions/ratings', {
        movie_id: selectedMovie.id,
        score: score
      });
      // Rating and reviews already persist correctly -- the only problem
      // was discoverability. A brief confirmation gives visible feedback
      // that the click actually did something.
      setRatingSaved(true);
      setTimeout(() => setRatingSaved(false), 2000);
    } catch (err) {
      console.error("Failed rating", err);
    }
  };

  if (!selectedMovie) return null;

  const fav = isFavorite(selectedMovie.id);
  const watchlistStatus = getWatchlistStatus(selectedMovie.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in"
      onClick={() => setSelectedMovie(null)}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] glass-panel rounded-3xl overflow-y-auto border border-slate-800 shadow-2xl my-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${selectedMovie.title} details`}
      >
        
        {/* Backdrop Banner Header — always dark, sits on the movie's own artwork */}
        <div className="relative min-h-[260px] sm:min-h-[340px] w-full overflow-hidden bg-slate-950 media-overlay">
          <img
            src={selectedMovie.backdrop_path || selectedMovie.poster_path || FALLBACK_POSTER}
            alt={selectedMovie.title}
            onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_POSTER; }}
            className="w-full h-full object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-cineverse-dark via-cineverse-dark/60 to-transparent" />
          
          {/* Close Button */}
          <button
            onClick={() => setSelectedMovie(null)}
            aria-label="Close movie details"
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 hover:bg-black text-slate-300 hover:text-white transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Quick Play Trailer on Banner */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setTrailerMovie(selectedMovie)}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm shadow-2xl hover:scale-105 transition-all"
            >
              <Play className="w-5 h-5 fill-black" /> Watch Trailer
            </button>
          </div>
        </div>

        {/* Content Body — Unclipped Natural Flow */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Title & Metadata */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {selectedMovie.genres && selectedMovie.genres.join(', ')}
                </span>
                <span className="text-xs text-slate-400">{selectedMovie.release_year} • {selectedMovie.runtime} min • {selectedMovie.language || 'English'}</span>
              </div>
              <h2 className="font-display font-black text-3xl sm:text-5xl text-white">
                {selectedMovie.title}
              </h2>
              {selectedMovie.tagline && (
                <p className="text-xs sm:text-sm text-cyan-300/90 italic">"{selectedMovie.tagline}"</p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Star rating -- moved up here next to the primary actions
                  and made visually bigger. It was previously tucked into a
                  small side panel next to streaming-provider chips, easy to
                  never notice, even though rating and reviews already
                  persist correctly to the backend. */}
              <div className="relative flex items-center gap-1 px-3 py-2 rounded-full bg-slate-800 border border-slate-700">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    className="p-0.5 hover:scale-125 transition-transform"
                  >
                    <Star className={`w-6 h-6 ${star <= userRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                  </button>
                ))}
                {ratingSaved && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-full border border-emerald-500/30 shadow-lg">
                    Rating saved ✓
                  </span>
                )}
              </div>

              <button
                onClick={() => toggleWatchlist(selectedMovie.id)}
                aria-label={watchlistStatus ? 'Remove from watchlist' : 'Add to watchlist'}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${
                  watchlistStatus ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {watchlistStatus ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
                {watchlistStatus ? 'In Watchlist' : 'Add to Watchlist'}
              </button>

              <button
                onClick={() => toggleFavorite(selectedMovie.id)}
                aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                className={`p-2.5 rounded-full border transition-all ${
                  fav ? 'bg-rose-500/20 text-rose-500 border-rose-500/40' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${fav ? 'fill-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* AI Match Explanation Box */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-violet-950/30 to-slate-900 border border-cyan-500/30 p-4 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">
                Recommendation Insights ({selectedMovie.match_score || 95}% Match)
              </h4>
              <p className="text-xs sm:text-sm text-slate-200">
                {selectedMovie.recommendation_reason || "Matches your profile interest in high-density narrative architectures and signature direction."}
              </p>
            </div>
          </div>

          {/* Synopsis, Cast & Rating Sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Synopsis</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedMovie.overview}</p>
              </div>
              
              <div className="pt-2 border-t border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Director & Cast</h4>
                <p className="text-xs text-slate-300">
                  <span className="font-semibold text-white">Director:</span> {selectedMovie.director || "N/A"}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  <span className="font-semibold text-white">Featured Cast:</span> {selectedMovie.cast ? selectedMovie.cast.join(', ') : 'N/A'}
                </p>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shrink-0">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-cyan-400" /> Where to Watch
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedMovie.streaming_providers || ["Netflix", "Prime Video"]).map(provider => (
                    <span key={provider} className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-200 border border-slate-700">
                      {provider}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Similar Movies Section */}
          {similarMovies.length > 0 && (
            <div className="border-t border-slate-800 pt-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Film className="w-4 h-4 text-cyan-400" /> Similar Movies You Might Enjoy
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {similarMovies.slice(0, 4).map(m => (
                  <div key={m.id} onClick={() => setSelectedMovie(m)} className="cursor-pointer">
                    <MovieCard movie={m} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community Reviews Section */}
          <div className="border-t border-slate-800 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" /> CineMind Community Reviews
            </h4>

            {/* Post Review Form */}
            <form onSubmit={handleReviewSubmit} className="mb-6 space-y-2">
              <textarea
                value={newReview}
                onChange={(e) => setNewReview(e.target.value)}
                placeholder="Share your thoughts or theories on this film..."
                rows={2}
                className="w-full p-3 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={spoilers}
                    onChange={(e) => setSpoilers(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  Contains Spoilers
                </label>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Post Review
                </button>
              </div>
            </form>

            {/* Reviews List — Unclipped */}
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No community reviews posted yet. Write the first one!</p>
              ) : (
                reviews.map(r => (
                  <div key={r.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-bold text-slate-200">{r.username}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{r.review_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
