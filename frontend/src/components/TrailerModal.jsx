import React, { useState, useEffect, useRef } from 'react';
import { X, Film, ExternalLink, AlertCircle } from 'lucide-react';
import { useMovies } from '../context/MovieContext';
import useFocusTrap from '../hooks/useFocusTrap';

export default function TrailerModal() {
  const { trailerMovie, setTrailerMovie } = useMovies();
  const [videoError, setVideoError] = useState(false);
  const panelRef = useRef(null);
  useFocusTrap(panelRef, !!trailerMovie);

  const closeModal = () => { setTrailerMovie(null); setVideoError(false); };

  // Close on Escape, matching the details and auth modals.
  useEffect(() => {
    if (!trailerMovie) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [trailerMovie]);

  if (!trailerMovie) return null;

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trailerMovie.title + ' official trailer')}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-w-4xl glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${trailerMovie.title} trailer`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2 truncate pr-4">
            <Film className="w-5 h-5 text-cyan-400 shrink-0" />
            <h3 className="font-display font-bold text-white text-base sm:text-lg truncate">
              {trailerMovie.title} — Official Trailer
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
              title="Watch on YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Watch on YouTube
            </a>
            <button
              onClick={closeModal}
              aria-label="Close trailer"
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Container / Graceful Fallback — always dark, standard cinema-style player chrome */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center media-overlay">
          {videoError || !trailerMovie.trailer_url ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-display font-bold text-lg text-white">Inline Trailer Unavailable</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  YouTube restrictions or embedding settings prevent inline playback for this title.
                </p>
              </div>
              <a
                href={youtubeSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all"
              >
                <ExternalLink className="w-4 h-4" /> Search Trailer on YouTube
              </a>
            </div>
          ) : (
            <iframe
              src={trailerMovie.trailer_url}
              title={`${trailerMovie.title} Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={() => setVideoError(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
