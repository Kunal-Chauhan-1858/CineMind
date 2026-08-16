import React, { useState, useEffect } from 'react';
import { User, Heart, Settings, Trash2, Edit3, Camera, Check, Star, ShieldCheck, Film } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMovies } from '../context/MovieContext';
import apiClient from '../api/client';
import MovieCard from '../components/MovieCard';

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"
];

export default function ProfilePage() {
  const { user, updatePreferences } = useAuth();
  const { favorites, watchlist } = useMovies();

  const [activeTab, setActiveTab] = useState('profile');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || AVATAR_PRESETS[0]);
  const [preferredGenres, setPreferredGenres] = useState(user?.preferred_genres || ["Sci-Fi", "Action"]);
  const [successMsg, setSuccessMsg] = useState('');

  const ALL_GENRES = ["Sci-Fi", "Action", "Thriller", "Drama", "Comedy", "Animation", "Horror", "Crime", "Adventure", "Romance", "Mystery"];

  const handleSavePreferences = () => {
    updatePreferences({
      avatar_url: selectedAvatar,
      preferred_genres: preferredGenres
    });
    setSuccessMsg("Preferences saved successfully!");
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const toggleGenre = (genre) => {
    if (preferredGenres.includes(genre)) {
      setPreferredGenres(preferredGenres.filter(g => g !== genre));
    } else {
      setPreferredGenres([...preferredGenres, genre]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <img
              src={selectedAvatar}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400 shadow-xl shadow-cyan-500/20"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-2xl text-white">{user?.full_name || user?.username || "Cinephile User"}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                PRO MEMBER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
              <span><b>{favorites.length}</b> Favorites</span> • <span><b>{watchlist.length}</b> Watchlist Items</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Preferences & Avatars
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'favorites' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Favorite Films ({favorites.length})
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
          {successMsg}
        </div>
      )}

      {/* Tab 1: Profile & Preferences */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Avatar Selector */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" /> Choose Profile Avatar
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              {AVATAR_PRESETS.map((avatar, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`relative rounded-full p-1 transition-all ${
                    selectedAvatar === avatar ? 'ring-4 ring-cyan-400 scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={avatar} alt={`Avatar ${idx}`} className="w-14 h-14 rounded-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Genre Preferences */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" /> Favorite Genres (ML Training Weights)
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALL_GENRES.map((genre) => {
                const isSelected = preferredGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
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
            
            <button
              onClick={handleSavePreferences}
              className="mt-4 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all"
            >
              Save Profile Preferences
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Favorites Grid */}
      {activeTab === 'favorites' && (
        <div>
          {favorites.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800">
              <p className="text-slate-400 text-sm">No favorite movies added yet. Click the heart icon on any movie to save it here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favorites.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
