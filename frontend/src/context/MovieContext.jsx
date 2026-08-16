import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';

const MovieContext = createContext();

export const MovieProvider = ({ children }) => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [watchlistError, setWatchlistError] = useState(null);
  const [activeVibe, setActiveVibe] = useState('Any');
  const [selectedMovie, setSelectedMovie] = useState(null); // Details Modal
  const [trailerMovie, setTrailerMovie] = useState(null); // Trailer Player Modal
  const [voiceSearchOpen, setVoiceSearchOpen] = useState(false);

  // Fetch watchlist & favorites on mount/user change
  useEffect(() => {
    if (user) {
      fetchWatchlist();
      fetchFavorites();
    }
  }, [user]);

  const fetchWatchlist = async () => {
    try {
      const res = await apiClient.get('/interactions/watchlist');
      setWatchlist(res.data);
      setWatchlistError(null);
    } catch (err) {
      console.error("Failed to fetch watchlist", err);
      // Previously this was a silent console.error with nothing shown to
      // the user -- the Watchlist page just looked permanently empty on a
      // failed fetch. Surfacing this lets WatchlistPage render a real error
      // state with a retry action.
      setWatchlistError("Couldn't load your watchlist.");
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await apiClient.get('/interactions/favorites');
      setFavorites(res.data);
    } catch (err) {
      console.error("Failed to fetch favorites", err);
    }
  };

  const updateWatchlistStatus = async (movieId, status = 'want_to_watch') => {
    try {
      await apiClient.post('/interactions/watchlist', { movie_id: movieId, status });
      fetchWatchlist();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error("Error updating watchlist:", err);
    }
  };

  // Previously there was no way to actually remove a movie from the
  // watchlist from the UI -- the only wired-up action re-posted a
  // 'completed' status over it. The DELETE endpoint already existed on the
  // backend (app/api/interactions.py) but nothing on the frontend called
  // it. This is now used by the Watchlist page and by the toggle buttons
  // on the card/banner/modal so clicking an already-added movie actually
  // removes it instead of silently relabeling it "completed".
  const removeFromWatchlist = async (movieId) => {
    try {
      await apiClient.delete(`/interactions/watchlist/${movieId}`);
      setWatchlist(prev => prev.filter(w => w.movie_id !== movieId));
    } catch (err) {
      console.error("Error removing from watchlist:", err);
    }
  };

  // Single entry point used everywhere (card / banner / modal / watchlist
  // page) so "add to watchlist" behaves identically no matter where it's
  // clicked: not in the list -> add as 'want_to_watch'; already in the
  // list -> remove it. Marking something "completed" (watched) is a
  // separate, explicit action and is no longer conflated with this toggle.
  const toggleWatchlist = async (movieId) => {
    if (getWatchlistStatus(movieId)) {
      await removeFromWatchlist(movieId);
    } else {
      await updateWatchlistStatus(movieId, 'want_to_watch');
    }
  };

  const toggleFavorite = async (movieId) => {
    try {
      await apiClient.post(`/interactions/favorites/toggle/${movieId}`);
      fetchFavorites();
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const isFavorite = (movieId) => {
    return favorites.some(m => m.id === movieId);
  };

  const getWatchlistStatus = (movieId) => {
    const item = watchlist.find(w => w.movie_id === movieId);
    return item ? item.status : null;
  };

  return (
    <MovieContext.Provider value={{
      watchlist,
      favorites,
      watchlistError,
      activeVibe,
      setActiveVibe,
      selectedMovie,
      setSelectedMovie,
      trailerMovie,
      setTrailerMovie,
      voiceSearchOpen,
      setVoiceSearchOpen,
      updateWatchlistStatus,
      removeFromWatchlist,
      toggleWatchlist,
      toggleFavorite,
      isFavorite,
      getWatchlistStatus,
      fetchWatchlist
    }}>
      {children}
    </MovieContext.Provider>
  );
};

export const useMovies = () => useContext(MovieContext);
