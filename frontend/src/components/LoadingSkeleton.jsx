import React from 'react';

export default function LoadingSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 my-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl glass-panel p-3 border border-slate-800 animate-pulse flex flex-col gap-3">
          <div className="aspect-[2/3] w-full bg-slate-800/80 rounded-xl" />
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-3 bg-slate-800/60 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
