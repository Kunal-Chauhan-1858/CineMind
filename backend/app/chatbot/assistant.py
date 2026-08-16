import re
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from app.models.models import Movie
from app.recommender.engine import recommender_engine
from app.services.search_service import search_movies

class CineBotAssistant:
    def __init__(self):
        self.vibe_keywords = {
            "mind-bending": ["mind-bending", "mind bending", "twist", "psychological", "trippy", "reality", "matrix", "inception", "interstellar"],
            "feel-good": ["feel-good", "feel good", "wholesome", "heartwarming", "cozy", "happy", "uplifting", "comfort"],
            "dark & gritty": ["dark", "gritty", "noir", "crime", "brutal", "intense", "suspense", "gotham", "batman"],
            "adrenaline rush": ["action", "adrenaline", "explosive", "fast-paced", "thrilling", "chase", "marvel"],
            "thought-provoking": ["philosophical", "deep", "existential", "meaningful", "thought-provoking", "dramatical"],
            "cyberpunk": ["cyberpunk", "futuristic", "neon", "ai", "tech", "dystopian", "blade runner"],
            "bollywood": ["bollywood vibe", "hindi vibe", "desi vibe"],
        }

        self.genre_keywords = {
            "sci-fi": ["sci-fi", "scifi", "science fiction", "space", "robot", "alien", "future"],
            "action": ["action", "fight", "war", "superhero", "combat"],
            "thriller": ["thriller", "mystery", "suspense", "serial killer", "investigation"],
            "drama": ["drama", "emotional", "biography", "life", "relationship"],
            "comedy": ["comedy", "funny", "hilarious", "humor", "satire"],
            "animation": ["animation", "animated", "anime", "pixar", "disney"],
            "horror": ["horror", "scary", "ghost", "spooky", "terrifying"],
        }

        # Industry tags ("Bollywood" / "South Indian") used to live inside
        # self.genre_keywords, which caused two bugs on combined queries like
        # "Bollywood comedy": (1) detection broke on the FIRST dict match, so
        # whichever of "bollywood" or "comedy" happened to appear earlier in
        # the dict silently won and the other was discarded, and (2) even if
        # both were somehow detected, calculate_hybrid_scores only accepted a
        # single genre_filter, with no way to require an industry tag AND a
        # genre simultaneously. Keeping industry tags in their own dict lets
        # detected_genre and detected_industry both be non-None at once, and
        # both get passed through to the engine as independent AND filters.
        self.industry_keywords = {
            "bollywood": ["bollywood", "hindi", "hindi movie", "hindi cinema", "desi"],
            "south indian": ["south indian", "tollywood", "kollywood", "telugu", "tamil"],
        }

    def process_chat_message(self, db: Session, user_message: str) -> Tuple[str, List[Movie]]:
        msg_lower = user_message.lower().strip()
        movies = db.query(Movie).all()

        # 1) Direct title match first -- e.g. "tell me about Inception" or
        # just "Inception" should surface that exact movie, not a generic
        # top-5 list. Previously the bot only ever matched a fixed vibe/
        # genre/director keyword list and silently ignored anything else
        # typed, including real movie and actor names.
        matched_movie = None
        for m in movies:
            title_lower = m.title.lower()
            if len(title_lower) >= 4 and re.search(rf"\b{re.escape(title_lower)}\b", msg_lower):
                matched_movie = m
                break

        if matched_movie:
            reply = f'Found "{matched_movie.title}" ({matched_movie.release_year}) in the library -- here it is, plus a few similar picks:'
            similar_pool = [
                m for m in movies
                if m.id != matched_movie.id and set(m.genres or []) & set(matched_movie.genres or [])
            ]
            similar = []
            if similar_pool:
                hybrid_recs = recommender_engine.calculate_hybrid_scores(
                    db=db, user=None, movies=similar_pool,
                    vibe_filter=None, genre_filter=None, top_n=4,
                )
                similar = [item["movie"] for item in hybrid_recs]
            return reply, [matched_movie] + similar

        # 2) Direct actor match -- e.g. "movies with Tom Hardy"
        matched_actor = None
        for m in movies:
            if m.cast:
                for actor in m.cast:
                    if len(actor) >= 4 and actor.lower() in msg_lower:
                        matched_actor = actor
                        break
            if matched_actor:
                break

        if matched_actor:
            actor_movies = [m for m in movies if m.cast and matched_actor in m.cast]
            if actor_movies:
                hybrid_recs = recommender_engine.calculate_hybrid_scores(
                    db=db, user=None, movies=actor_movies, top_n=5
                )
                recommended = [item["movie"] for item in hybrid_recs]
                return f"Here's what we have starring {matched_actor}:", recommended

        # 3) Vibe / genre / director / rating keyword detection
        detected_vibe = None
        for vibe, keywords in self.vibe_keywords.items():
            if any(k in msg_lower for k in keywords):
                detected_vibe = vibe
                break

        detected_genre = None
        for genre, keywords in self.genre_keywords.items():
            if any(k in msg_lower for k in keywords):
                detected_genre = genre
                break

        # Detected independently of detected_genre -- "Bollywood comedy"
        # should end up with detected_genre="comedy" AND
        # detected_industry="bollywood" both set, not one clobbering the
        # other.
        detected_industry = None
        for industry, keywords in self.industry_keywords.items():
            if any(k in msg_lower for k in keywords):
                detected_industry = industry
                break

        matched_director = None
        for m in movies:
            if m.director and len(m.director) >= 4 and m.director.lower() in msg_lower:
                matched_director = m.director
                break

        min_rating = 0.0
        if "top rated" in msg_lower or "best" in msg_lower or "highest rating" in msg_lower:
            min_rating = 8.0

        # 4) If none of the mood/genre/director keywords matched at all, try
        # a real free-text catalog search (title/overview/director/cast/
        # keywords) before falling back to a generic list -- this is what
        # lets CineBot actually "search", not just recognize a fixed set of
        # mood words.
        if not (detected_vibe or detected_genre or detected_industry or matched_director or min_rating):
            search_results = search_movies(db, q=user_message, limit=5)
            if search_results:
                return f'Here\'s what matched "{user_message}" in the library:', search_results

        # 5) Vibe / genre / director / rating based recommendation (existing
        # hybrid engine -- now actually re-ranks per vibe/genre, see the
        # fixes in recommender/engine.py)
        hybrid_recs = recommender_engine.calculate_hybrid_scores(
            db=db,
            user=None,
            movies=movies,
            vibe_filter=detected_vibe,
            genre_filter=detected_genre,
            industry_filter=detected_industry,
            min_rating=min_rating,
            top_n=5
        )
        recommended_movies = [item["movie"] for item in hybrid_recs]

        if matched_director:
            reply = f"Here are top-rated films by {matched_director}:"
        else:
            # Build the reply from whatever combination of vibe/genre/
            # industry/rating was actually detected, instead of an elif
            # chain that silently dropped one signal whenever two were both
            # present (e.g. "top rated Bollywood movies" only ever mentioned
            # "Bollywood" and quietly ignored that "top rated" was also
            # requested, or "Bollywood comedy" only ever mentioned one of
            # the two).
            parts = []
            if detected_industry:
                parts.append(f"{detected_industry.title()}")
            if detected_vibe:
                parts.append(f"{detected_vibe.title()} vibe")
            if detected_genre:
                parts.append(f"{detected_genre.title()} movies")
            if min_rating > 0:
                parts.append("top-rated (8.0+)")

            if parts:
                reply = f"Here's what matches {' + '.join(parts)}:"
            elif recommended_movies:
                reply = "Couldn't find an exact match, so here are a few well-rated picks you might like instead:"
            else:
                reply = 'I couldn\'t find anything matching that -- try a movie title, an actor\'s name, or a mood like "feel-good" or "dark thriller".'

        return reply, recommended_movies

cinebot = CineBotAssistant()
