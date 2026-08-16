import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Mic, Sparkles, Sun, Moon, Bookmark, BarChart3, LogOut, LogIn, ArrowRight, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useMovies } from '../context/MovieContext';
import { useChat } from '../context/ChatContext';
import apiClient from '../api/client';
import Logo from './Logo';

export default function Navbar() {
  const { user, logout, isGuest } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { watchlist, setVoiceSearchOpen, setSelectedMovie } = useMovies();
  const { toggleChat } = useChat();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  // Debounced autocomplete search effect (350ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAutocompleteResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get('/search', { params: { q: searchQuery, limit: 5 } });
        setAutocompleteResults(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error("Autocomplete search error:", err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      setMobileSearchOpen(false);
      navigate(`/discover?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Discover', path: '/discover' },
    { name: 'Watchlist', path: '/watchlist', badge: watchlist.length },
    { name: 'Taste Analytics', path: '/dashboard' },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-violet-600 to-amber-500 p-[2px] shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white dark:bg-cineverse-dark rounded-[10px] flex items-center justify-center">
              <Logo className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              Cine<span className="gradient-text">Mind</span>
            </span>
          </div>
        </Link>

        {/* Search Bar with Debounced Autocomplete */}
        <div ref={searchRef} className="hidden md:flex items-center flex-1 max-w-md relative">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, actor, director, prompt, or vibe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowDropdown(true)}
              className="w-full pl-10 pr-10 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
            <button
              type="button"
              onClick={() => setVoiceSearchOpen(true)}
              aria-label="Voice search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 p-1 transition-colors"
              title="Voice Search"
            >
              <Mic className="w-4 h-4" />
            </button>
          </form>

          {/* Autocomplete Popup Dropdown */}
          {showDropdown && autocompleteResults.length > 0 && (
            <div className="absolute top-12 left-0 right-0 glass-panel rounded-2xl p-2 shadow-2xl border border-slate-300 dark:border-slate-700/80 z-50 animate-in fade-in slide-in-from-top-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400 border-b border-slate-200 dark:border-slate-800">
                Live Search Suggestions
              </div>
              {autocompleteResults.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => {
                    setSelectedMovie(movie);
                    setShowDropdown(false);
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <img
                      src={movie.poster_path}
                      alt={movie.title}
                      className="w-8 h-11 object-cover rounded-lg border border-slate-300 dark:border-slate-700"
                    />
                    <div className="truncate">
                      <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 truncate">{movie.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{movie.release_year} • {movie.genres && movie.genres[0]} • {movie.director}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold shrink-0">
                    <Star className="w-3 h-3 fill-amber-400" /> {movie.imdb_rating}
                  </div>
                </div>
              ))}
              <button
                onClick={handleSearchSubmit}
                className="w-full py-2 text-center text-xs text-cyan-600 dark:text-cyan-400 font-bold hover:bg-cyan-500/10 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                View all results for "{searchQuery}" <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Center Navigation Links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                  isActive
                    ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
                }`}
              >
                {link.name}
                {link.badge > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.2 rounded-full bg-cyan-500 text-black font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Utility Buttons */}
        <div className="flex items-center gap-3">
          {/* Mobile search entry point — the search bar above is
              `hidden md:flex`, so below md there was previously no way to
              search at all. This icon expands to a full-width input. */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Open search"
            className="md:hidden p-2 rounded-xl bg-slate-200/80 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 transition-colors border border-slate-300 dark:border-slate-700/50"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* AI Chat Assistant Trigger Pill */}
          <button
            onClick={toggleChat}
            aria-label="Ask Movie Assistant"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-violet-500/20 hover:scale-105 transition-all"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span className="hidden sm:inline">Ask Movie Assistant</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl bg-slate-200/80 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors border border-slate-300 dark:border-slate-700/50"
            title="Toggle Dark/Light Mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="Open user menu"
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800/60 border border-slate-300 dark:border-slate-700/50 transition-colors"
            >
              <img
                src={user?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover border border-cyan-400/40"
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-2xl border border-slate-300 dark:border-slate-700/60 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.username || "Guest User"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || "guest@cinemind.app"}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl"
                  >
                    <BarChart3 className="w-4 h-4" /> Taste Analytics Dashboard
                  </Link>
                  <Link
                    to="/watchlist"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl"
                  >
                    <Bookmark className="w-4 h-4" /> My Watchlist
                  </Link>
                </div>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                  {isGuest ? (
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/login'); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-cyan-500 hover:bg-cyan-500/10 rounded-xl transition-colors"
                    >
                      <LogIn className="w-4 h-4" /> Sign In / Create Account
                    </button>
                  ) : (
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); navigate('/login'); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Switch Profile / Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Mobile Search Overlay — full-width input reachable from the
          search icon added to the right-utility row above. */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-slate-950 px-4 py-3 animate-in fade-in slide-in-from-top-2">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type="text"
                placeholder="Search title, actor, director, or vibe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
              className="px-3 py-2.5 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0"
            >
              Cancel
            </button>
          </form>

          {autocompleteResults.length > 0 && searchQuery.trim() && (
            <div className="mt-2 space-y-1 max-h-72 overflow-y-auto">
              {autocompleteResults.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => {
                    setSelectedMovie(movie);
                    setMobileSearchOpen(false);
                  }}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <img
                    src={movie.poster_path}
                    alt={movie.title}
                    className="w-8 h-11 object-cover rounded-lg border border-slate-300 dark:border-slate-700"
                  />
                  <div className="truncate">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{movie.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{movie.release_year} • {movie.genres && movie.genres[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
