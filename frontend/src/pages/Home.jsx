import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Compass, Film, Flame, Star, Zap, Heart, Tv } from 'lucide-react';
import HeroSpotlight from '../components/HeroSpotlight';
import VibeFilterBar from '../components/VibeFilterBar';
import MovieRow from '../components/MovieRow';
import LoadingSkeleton from '../components/LoadingSkeleton';
import apiClient from '../api/client';
import { useMovies } from '../context/MovieContext';

export default function Home() {
  const { activeVibe, watchlist } = useMovies();
  const [spotlightMovie, setSpotlightMovie] = useState(null);
  const [hybridRecs, setHybridRecs] = useState([]);
  const [allMovies, setAllMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, [activeVibe]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const [spotRes, hybridRes, allRes] = await Promise.all([
        apiClient.get('/recommendations/spotlight'),
        apiClient.get(`/recommendations/hybrid?vibe=${encodeURIComponent(activeVibe)}`),
        apiClient.get('/movies')
      ]);

      setSpotlightMovie(spotRes.data);
      setHybridRecs(hybridRes.data);
      setAllMovies(allRes.data);
    } catch (err) {
      console.error("Error fetching home recommendations", err);
    } finally {
      setLoading(false);
    }
  };

  // Categorize movies into Netflix-style rows
  const trendingMovies = allMovies.filter(m => (m.cineverse_score || 0) >= 9.5);
  const sciFiMovies = allMovies.filter(m => m.genres && m.genres.includes('Sci-Fi'));
  const actionMovies = allMovies.filter(m => m.genres && (m.genres.includes('Action') || m.genres.includes('Thriller')));
  const dramaMovies = allMovies.filter(m => m.genres && (m.genres.includes('Drama') || m.genres.includes('Romance')));
  const animationMovies = allMovies.filter(m => m.genres && (m.genres.includes('Animation') || m.director === 'Hayao Miyazaki' || m.director === 'Makoto Shinkai'));
  const bollywoodMovies = allMovies.filter(m => (m.genres && m.genres.includes('Bollywood')) || m.language === 'Hindi');
  const southIndianMovies = allMovies.filter(m =>
    (m.genres && m.genres.includes('South Indian')) ||
    ['Tamil', 'Telugu', 'Malayalam', 'Kannada'].includes(m.language)
  );
  const watchlistMovies = watchlist.map(w => w.movie).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Hero Spotlight Banner */}
      {spotlightMovie && <HeroSpotlight movie={spotlightMovie} />}

      {/* Vibe Selection Pills */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800">
        <VibeFilterBar />
      </div>

      {loading ? (
        <LoadingSkeleton count={10} />
      ) : (
        <div className="space-y-4">
          {/* Row 1: Continue Watching / Watchlist (Logged in) */}
          {watchlistMovies.length > 0 && (
            <MovieRow
              title="Continue Watching & In Your Watchlist"
              subtitle="Saved to your library"
              icon={Tv}
              movies={watchlistMovies}
            />
          )}

          {/* Row 2: AI Hybrid Recommendations */}
          <MovieRow
            title="Recommended For You"
            subtitle={`Personalized for ${activeVibe} mood vector`}
            icon={Sparkles}
            movies={hybridRecs}
          />

          {/* Row 3: Bollywood & Hindi Cinema */}
          {bollywoodMovies.length > 0 && (
            <MovieRow
              title="Bollywood & Hindi Cinema"
              subtitle="Blockbusters and acclaimed classics from Hindi cinema"
              icon={Star}
              movies={bollywoodMovies}
            />
          )}

          {/* Row 4: South Indian Cinema */}
          {southIndianMovies.length > 0 && (
            <MovieRow
              title="South Indian Cinema"
              subtitle="Tamil • Telugu • Malayalam • Kannada blockbusters"
              icon={Flame}
              movies={southIndianMovies}
            />
          )}

          {/* Row 5: Trending Top Picks */}
          <MovieRow
            title="Trending Masterpieces"
            subtitle="Highest rated by critics and CineMind"
            icon={TrendingUp}
            movies={trendingMovies}
          />

          {/* Row 6: Sci-Fi & Cyberpunk */}
          <MovieRow
            title="Sci-Fi & Cyberpunk Realities"
            subtitle="Mind-bending space & futuristic cinema"
            icon={Flame}
            movies={sciFiMovies}
          />

          {/* Row 7: Action & Thrillers */}
          <MovieRow
            title="Adrenaline Action & Crime Thrillers"
            subtitle="High-octane excitement and suspense"
            icon={Zap}
            movies={actionMovies}
          />

          {/* Row 8: Drama & Romance */}
          <MovieRow
            title="Critically Acclaimed Drama & Romance"
            subtitle="Emotional storytelling and deep narratives"
            icon={Heart}
            movies={dramaMovies}
          />

          {/* Row 9: Animation & Anime */}
          <MovieRow
            title="Animation & Anime World"
            subtitle="Studio Ghibli, Makoto Shinkai & Spider-Verse"
            icon={Film}
            movies={animationMovies}
          />
        </div>
      )}
    </div>
  );
}
