import React from 'react';

/**
 * CineMind brand mark — a film-reel silhouette merged with a play
 * triangle, replacing the generic Lucide <Film> icon that was previously
 * standing in as the "logo". Pure SVG so it scales cleanly at any size
 * and inherits the app's gradient palette instead of a flat icon color.
 */
export default function Logo({ className = 'w-6 h-6' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="CineMind logo"
    >
      <defs>
        <linearGradient id="cv-logo-gradient" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Outer reel ring */}
      <circle cx="24" cy="24" r="21" stroke="url(#cv-logo-gradient)" strokeWidth="3" fill="none" />

      {/* Sprocket notches around the ring */}
      <circle cx="24" cy="6" r="2.6" fill="url(#cv-logo-gradient)" />
      <circle cx="40.4" cy="15" r="2.6" fill="url(#cv-logo-gradient)" />
      <circle cx="40.4" cy="33" r="2.6" fill="url(#cv-logo-gradient)" />
      <circle cx="24" cy="42" r="2.6" fill="url(#cv-logo-gradient)" />
      <circle cx="7.6" cy="33" r="2.6" fill="url(#cv-logo-gradient)" />
      <circle cx="7.6" cy="15" r="2.6" fill="url(#cv-logo-gradient)" />

      {/* Play triangle at the core */}
      <path d="M19.5 16.5L31.5 24L19.5 31.5V16.5Z" fill="url(#cv-logo-gradient)" />
    </svg>
  );
}
