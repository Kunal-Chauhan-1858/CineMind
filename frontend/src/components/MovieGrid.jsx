import React from 'react';
import { motion } from 'framer-motion';
import { FilmIcon } from 'lucide-react';
import MovieCard from './MovieCard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function MovieGrid({ movies, emptyMessage = "No movies found matching your filters.", emptyHint }) {
  if (!movies || movies.length === 0) {
    return (
      <div className="w-full py-16 px-6 text-center glass-panel rounded-3xl border border-slate-800 my-6 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
          <FilmIcon className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-white font-semibold text-base">{emptyMessage}</p>
        {emptyHint && <p className="text-slate-400 text-sm max-w-sm">{emptyHint}</p>}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 my-6"
    >
      {movies.map((movie) => (
        <motion.div key={movie.id} variants={itemVariants}>
          <MovieCard movie={movie} />
        </motion.div>
      ))}
    </motion.div>
  );
}
