import secrets
import json
import logging
from pathlib import Path
from typing import Dict, List
from sqlalchemy.orm import Session
from app.models.models import User, Movie, Genre, Rating, Review, Favorite, Watchlist
from app.auth.security import get_password_hash

SEED_GENRES = [
    {"name": "Sci-Fi", "slug": "sci-fi"},
    {"name": "Action", "slug": "action"},
    {"name": "Thriller", "slug": "thriller"},
    {"name": "Drama", "slug": "drama"},
    {"name": "Comedy", "slug": "comedy"},
    {"name": "Animation", "slug": "animation"},
    {"name": "Horror", "slug": "horror"},
    {"name": "Crime", "slug": "crime"},
    {"name": "Adventure", "slug": "adventure"},
    {"name": "Romance", "slug": "romance"},
    {"name": "Mystery", "slug": "mystery"},
    {"name": "Bollywood", "slug": "bollywood"},
    {"name": "South Indian", "slug": "south-indian"}
]

SEED_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
BUNDLED_CATALOG_PATH = SEED_DATA_DIR / "bundled_catalog.json"

# Emergency fallback if bundled_catalog.json is ever missing/corrupt at
# import time (e.g. a broken checkout) -- keeps the app bootable with a
# tiny catalog instead of crashing outright. Should never be hit in
# practice; the real catalog lives in bundled_catalog.json (see below).
_EMERGENCY_FALLBACK_MOVIES: List[Dict] = [
    {
        "tmdb_id": 27205,
        "title": "Inception",
        "overview": "Cobb, a skilled thief who steals corporate secrets through dream-sharing technology, is given the inverse task of planting an idea into the mind of a C.E.O.",
        "release_year": 2010,
        "runtime": 148,
        "poster_path": "https://image.tmdb.org/t/p/w500/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg",
        "backdrop_path": "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
        "imdb_rating": 8.8,
        "cineverse_score": 9.6,
        "genres": ["Sci-Fi", "Action", "Thriller"],
        "director": "Christopher Nolan",
        "cast": ["Leonardo DiCaprio", "Joseph Gordon-Levitt"],
        "language": "English",
    }
]


def _load_bundled_movies() -> List[Dict]:
    """
    Loads the shipped catalog from app/data/bundled_catalog.json.

    This file is a plain local JSON read -- no network call, no
    TMDB_API_KEY required -- which is the whole point: the app should
    have a real, reasonably-sized catalog (currently 44 titles, all with
    verified real TMDb poster/backdrop artwork) on every startup, not
    just when a live API key happens to be configured.

    To grow this file well past 44 titles, run (once, offline, whenever
    you have a TMDB_API_KEY handy):

        python -m scripts.build_bundled_catalog

    from backend/, which re-fetches this same file across the
    LANGUAGE_BUCKETS defined in catalog_sync.py and overwrites it with
    however many hundreds of movies it finds. The regenerated file then
    ships with the app like any other source file -- still no runtime
    key needed afterwards. See scripts/build_bundled_catalog.py.
    """
    try:
        with open(BUNDLED_CATALOG_PATH, "r", encoding="utf-8") as f:
            movies = json.load(f)
        if not isinstance(movies, list) or not movies:
            raise ValueError("bundled_catalog.json is empty or malformed")
        return movies
    except Exception as e:
        logging.getLogger("cineverse_seed_data").error(
            f"Could not load {BUNDLED_CATALOG_PATH} ({e}) -- "
            f"falling back to a {len(_EMERGENCY_FALLBACK_MOVIES)}-movie emergency seed."
        )
        return _EMERGENCY_FALLBACK_MOVIES


# Sourced from app/data/bundled_catalog.json -- see _load_bundled_movies()
# docstring above for how to regenerate/grow it.
SEED_MOVIES: List[Dict] = _load_bundled_movies()


def init_db_data(db: Session):
    # Ensure genres exist
    for g in SEED_GENRES:
        existing_g = db.query(Genre).filter(Genre.name == g["name"]).first()
        if not existing_g:
            db.add(Genre(name=g["name"], slug=g["slug"]))
    db.commit()

    # Ensure admin user exists
    admin_user = db.query(User).filter(User.email == "admin@cinemind.app").first()
    if not admin_user:
        admin_user = User(
            email="admin@cinemind.app",
            username="AdminUser",
            full_name="CineMind Admin",
            hashed_password=get_password_hash("password123"),
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
            preferred_genres=["Sci-Fi", "Action", "Bollywood", "Thriller"],
            favorite_directors=["Christopher Nolan", "S.S. Rajamouli", "Denis Villeneuve"],
            preferred_vibes=["Mind-Bending", "Adrenaline Rush"],
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # Ensure a dedicated, non-privileged guest account exists. This is the
    # account anonymous/no-token requests resolve to (see auth/deps.py) so
    # that guests get frictionless browsing/watchlist/ratings without ever
    # being able to land on the admin account.
    guest_user = db.query(User).filter(User.email == "guest@cinemind.app").first()
    if not guest_user:
        guest_user = User(
            email="guest@cinemind.app",
            username="Guest Cinephile",
            full_name="Guest",
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            avatar_url="https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=400&q=80",
            preferred_genres=["Sci-Fi", "Action"],
            preferred_vibes=["Mind-Bending"],
            is_admin=False
        )
        db.add(guest_user)
        db.commit()

    # Sync/Upsert movies
    for m_data in SEED_MOVIES:
        existing_m = db.query(Movie).filter(Movie.title == m_data["title"]).first()
        if not existing_m:
            movie = Movie(**m_data)
            db.add(movie)
        else:
            existing_m.poster_path = m_data["poster_path"]
            existing_m.backdrop_path = m_data["backdrop_path"]
            existing_m.trailer_url = m_data["trailer_url"]
            existing_m.genres = m_data["genres"]
            existing_m.vibe_tags = m_data["vibe_tags"]
            existing_m.language = m_data.get("language", "English")
    db.commit()

    # Seed initial user ratings if missing
    if db.query(Rating).count() == 0:
        first_movie = db.query(Movie).first()
        if first_movie and admin_user:
            db.add(Rating(user_id=admin_user.id, movie_id=first_movie.id, score=5.0))
            db.add(Review(
                user_id=admin_user.id,
                movie_id=first_movie.id,
                review_text="Absolute masterpiece of cinematic storytelling and visual precision!",
                contains_spoilers=False,
                likes_count=14
            ))
            db.add(Watchlist(user_id=admin_user.id, movie_id=first_movie.id, status="watching"))
            db.add(Favorite(user_id=admin_user.id, movie_id=first_movie.id))
            db.commit()
