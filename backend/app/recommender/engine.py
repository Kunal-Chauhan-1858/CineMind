import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from app.models.models import Movie, Rating, User, Watchlist, Favorite

class HybridRecommenderEngine:
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(stop_words='english')
        self.movie_features_matrix = None
        self.movie_id_map = {}
        self.idx_to_movie_id = {}
        self._fitted_ids = frozenset()  # tracks which exact movie set is currently fitted

    def _prepare_movie_corpus(self, movies: List[Movie]) -> List[str]:
        self.movie_id_map = {}
        self.idx_to_movie_id = {}
        corpus = []
        for i, movie in enumerate(movies):
            self.movie_id_map[movie.id] = i
            self.idx_to_movie_id[i] = movie.id

            genres = " ".join(movie.genres or [])
            cast = " ".join(movie.cast or [])
            keywords = " ".join(movie.keywords or [])
            vibes = " ".join(movie.vibe_tags or [])
            director = movie.director or ""
            
            # Weighted feature document
            text_doc = f"{movie.title} {movie.title} {movie.overview} {genres} {genres} {director} {director} {cast} {keywords} {vibes} {vibes}"
            corpus.append(text_doc.lower())
        return corpus

    def fit(self, movies: List[Movie]):
        if not movies:
            return
        # Re-fitting the TF-IDF vectorizer over the whole catalog is not
        # free, and calculate_hybrid_scores() used to call this on every
        # single call -- including twice in one CineBot reply (once for the
        # main catalog, once again for a "similar movies" follow-up query)
        # even though it's almost always the exact same movie set as the
        # previous call. This was the main source of CineBot feeling slow.
        # Skip the refit entirely when the incoming movie set is identical
        # to what's already fitted.
        incoming_ids = frozenset(m.id for m in movies)
        if incoming_ids == self._fitted_ids and self.movie_features_matrix is not None:
            return
        corpus = self._prepare_movie_corpus(movies)
        self.movie_features_matrix = self.tfidf_vectorizer.fit_transform(corpus)
        self._fitted_ids = incoming_ids

    def get_content_recommendations(self, movie_id: int, movies: List[Movie], top_n: int = 10) -> List[Tuple[int, float]]:
        if self.movie_features_matrix is None or movie_id not in self.movie_id_map:
            return []
        
        target_idx = self.movie_id_map[movie_id]
        target_vector = self.movie_features_matrix[target_idx]
        
        sim_scores = cosine_similarity(target_vector, self.movie_features_matrix).flatten()
        
        # Sort indices by similarity score descending
        sim_indices = np.argsort(sim_scores)[::-1]
        
        recs = []
        for idx in sim_indices:
            m_id = self.idx_to_movie_id[idx]
            if m_id != movie_id:
                recs.append((m_id, float(sim_scores[idx])))
            if len(recs) >= top_n:
                break
        return recs

    def calculate_hybrid_scores(
        self,
        db: Session,
        user: Optional[User],
        movies: List[Movie],
        vibe_filter: Optional[str] = None,
        genre_filter: Optional[str] = None,
        industry_filter: Optional[str] = None,
        min_rating: float = 0.0,
        top_n: int = 20
    ) -> List[Dict]:
        if not movies:
            return []

        # NOTE ON THE MATCH-SCORE FLOOR (previously a 75-99 clamp applied
        # per-movie before sorting): for an anonymous/unrated user the
        # content_score term below is a flat constant (0.5), so the raw
        # hybrid_val this formula can ever reach tops out well under 0.75.
        # Clamping every movie's individual score into a 75-99 band BEFORE
        # ranking meant every movie tied at the same displayed number, so
        # the subsequent sort had nothing left to differentiate on and
        # silently fell back to insertion order — vibe/genre filters
        # appeared to do nothing. The fix: rank on the *raw* score first,
        # then min-max normalize the *already-sorted* top results into a
        # display band (see bottom of this method) so the sort order
        # always reflects the actual differences, and the percentage the
        # user sees always reflects real relative standing within the
        # current result set instead of a fake shared floor.

        # Re-fit vectorizer to maintain up to date state
        self.fit(movies)

        # Get user interactions
        user_ratings = {}
        user_fav_ids = set()
        user_watched_ids = set()

        if user:
            ratings = db.query(Rating).filter(Rating.user_id == user.id).all()
            user_ratings = {r.movie_id: r.score for r in ratings}
            
            favs = db.query(Favorite).filter(Favorite.user_id == user.id).all()
            user_fav_ids = {f.movie_id for f in favs}
            
            watchlist = db.query(Watchlist).filter(Watchlist.user_id == user.id).all()
            user_watched_ids = {w.movie_id for w in watchlist if w.status == 'completed'}

        # Calculate seed profile vector if user has rated movies
        user_profile_vec = None
        if user_ratings and self.movie_features_matrix is not None:
            weighted_vectors = []
            weights = []
            for m_id, score in user_ratings.items():
                if m_id in self.movie_id_map:
                    idx = self.movie_id_map[m_id]
                    weighted_vectors.append(self.movie_features_matrix[idx] * score)
                    weights.append(score)
            if weighted_vectors:
                user_profile_vec = sum(weighted_vectors) / (sum(weights) + 1e-5)

        user_preferred_genres = set(user.preferred_genres) if user and user.preferred_genres else set()
        user_preferred_vibes = set(user.preferred_vibes) if user and user.preferred_vibes else set()

        scored_movies = []

        for movie in movies:
            # Filter checks
            if genre_filter and genre_filter.lower() != "all":
                if genre_filter.lower() not in [g.lower() for g in (movie.genres or [])]:
                    continue

            # Industry filter (e.g. "bollywood", "south indian") applied as
            # its own hard AND filter, independent of genre_filter, so a
            # combined query like "Bollywood comedy" requires BOTH the
            # industry tag AND the genre to match -- previously there was no
            # way to express this and one of the two signals was always
            # silently dropped.
            if industry_filter and industry_filter.lower() != "all":
                movie_genres_lower = [g.lower() for g in (movie.genres or [])]
                movie_vibes_lower = [v.lower() for v in (movie.vibe_tags or [])]
                if (industry_filter.lower() not in movie_genres_lower
                        and industry_filter.lower() not in movie_vibes_lower):
                    continue

            if min_rating > 0 and (movie.cineverse_score or movie.imdb_rating) < min_rating:
                continue

            # 1. Content-based similarity score (0 to 1)
            content_score = 0.5
            if user_profile_vec is not None and movie.id in self.movie_id_map:
                m_idx = self.movie_id_map[movie.id]
                m_vec = self.movie_features_matrix[m_idx]
                sim = cosine_similarity(user_profile_vec, m_vec)[0][0]
                content_score = float(sim)

            # 2. Vibe match score (0 to 1) — a real, catalog-wide signal now
            # that every movie gets vibe_tags backfilled at ingest time (see
            # tmdb.py:derive_vibe_tags), not just the ~44 hand-curated ones.
            # The match/mismatch gap is kept wide (1.0 vs 0.1) so an explicit
            # vibe selection visibly reorders results instead of being a
            # rounding error next to the other terms.
            vibe_score = 0.5
            movie_vibes = set(movie.vibe_tags or [])
            if vibe_filter and vibe_filter.lower() != "any":
                if any(vibe_filter.lower() in v.lower() for v in movie_vibes):
                    vibe_score = 1.0
                else:
                    vibe_score = 0.1
            elif user_preferred_vibes:
                overlap = movie_vibes.intersection(user_preferred_vibes)
                vibe_score = len(overlap) / max(len(user_preferred_vibes), 1)

            # 3. Rating & Popularity score (0 to 1)
            rating_score = (movie.cineverse_score / 10.0) * 0.7 + (movie.imdb_rating / 10.0) * 0.3

            # 4. Preference match boost (Director / Genre)
            genre_boost = 0.0
            if user_preferred_genres:
                g_overlap = set(movie.genres or []).intersection(user_preferred_genres)
                genre_boost = len(g_overlap) * 0.1

            director_boost = 0.15 if user and user.favorite_directors and movie.director in user.favorite_directors else 0.0

            # Calculate Final Hybrid Score (raw, NOT clamped here — see note
            # above the function). Vibe is weighted on par with content/
            # rating (not diluted at a flat 25%) precisely because an
            # explicit vibe pick is the strongest, most intentional signal
            # a user can give us for "what do I want right now".
            hybrid_val = (0.25 * content_score + 0.35 * vibe_score + 0.30 * rating_score + 0.07 * genre_boost + 0.03 * director_boost)

            scored_movies.append({
                "movie": movie,
                "raw_score": hybrid_val,
            })

        # Sort by raw score descending — this now actually reflects vibe/
        # genre/content differences instead of tying at a shared floor.
        scored_movies.sort(key=lambda x: x["raw_score"], reverse=True)
        top_results = scored_movies[:top_n]

        if not top_results:
            return []

        # Min-max normalize the raw scores of the *selected* top results into
        # a 60-99% display band. This keeps "% Match" readable/motivating
        # (never shows something silly like 8%) while guaranteeing the
        # numbers actually differ across the visible set and across vibes —
        # unlike the old fixed 75-99 clamp, which could (and did) collapse
        # every candidate to the exact same number.
        raw_vals = [item["raw_score"] for item in top_results]
        min_raw, max_raw = min(raw_vals), max(raw_vals)
        spread = max_raw - min_raw

        final_results = []
        for item in top_results:
            if spread > 1e-6:
                normalized = (item["raw_score"] - min_raw) / spread
            else:
                normalized = 1.0  # every candidate scored identically — legitimate tie
            match_percentage = round(60.0 + normalized * 39.0, 1)

            reason = self._generate_reason(item["movie"], match_percentage, vibe_filter, user_preferred_genres, user_ratings)

            final_results.append({
                "movie": item["movie"],
                "match_score": match_percentage,
                "recommendation_reason": reason
            })

        return final_results

    def _generate_reason(self, movie: Movie, match_score: float, vibe_filter: Optional[str], preferred_genres: set, user_ratings: dict) -> str:
        vibes_str = ", ".join(movie.vibe_tags[:2]) if movie.vibe_tags else "cinematic"
        director_str = f"directed by {movie.director}" if movie.director else ""
        
        if match_score >= 94.0:
            return f"Must Watch ({match_score}% Match) — Top recommendation blending {vibes_str} themes {director_str} with stellar audience ratings."
        elif match_score >= 88.0:
            return f"Great Choice ({match_score}% Match) — Perfectly aligns with your love for {movie.genres[0] if movie.genres else 'quality film'} and {vibes_str} energy."
        else:
            return f"Recommended ({match_score}% Match) — Highly rated {movie.release_year} film with {vibes_str} atmosphere."

recommender_engine = HybridRecommenderEngine()
