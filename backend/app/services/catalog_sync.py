import logging
import re
from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.models.models import Movie
from app.services.tmdb import (
    tmdb_service,
    normalize_discover_result,
    derive_vibe_tags,
    TMDBService,
    FALLBACK_POSTER_URL,
    FALLBACK_BACKDROP_URL,
)

logger = logging.getLogger("cineverse_catalog_sync")

# Once the local catalog reaches this many titles, startup sync is skipped
# (the "Load More Movies" button on Discover still pulls further pages live).
# Keeps startup fast on subsequent runs instead of re-fetching every restart.
CATALOG_SIZE_THRESHOLD = 250

# Global popularity sort skews heavily toward English-language blockbusters.
# Per explicit product direction, Indian cinema is prioritized here, but
# "prioritized" no longer means Hollywood/international gets a token 1-2
# pages while Indian buckets get 10x that — both sides are now sized so
# they're each well represented in the final catalog. Page counts pull
# from Settings (see config/settings.py) so the ratio can be reshaped via
# .env without touching this file. Each entry is
# (label, original_language_code, pages_to_fetch, min_vote_count).
# Indian-language buckets use a lower vote-count floor than the TMDb
# default (20) since regional industries get far fewer international
# votes than Hollywood titles at an equivalent level of real popularity —
# the higher floor would otherwise quietly exclude most of them.
_indian_base = settings.CATALOG_PAGES_INDIAN_BASE
LANGUAGE_BUCKETS: List[Tuple[str, Optional[str], int, int]] = [
    ("Bollywood / Hindi Cinema", "hi", _indian_base, 5),
    ("Tamil Cinema", "ta", round(_indian_base * 0.5), 3),
    ("Telugu Cinema", "te", round(_indian_base * 0.5), 3),
    ("Malayalam Cinema", "ml", round(_indian_base * 0.375), 2),
    ("Kannada Cinema", "kn", round(_indian_base * 0.375), 2),
    ("Global Popular", None, settings.CATALOG_PAGES_GLOBAL, 20),
    ("Korean Cinema", "ko", settings.CATALOG_PAGES_KOREAN, 20),
    ("Japanese Cinema", "ja", settings.CATALOG_PAGES_JAPANESE, 20),
    ("Spanish-Language Cinema", "es", settings.CATALOG_PAGES_SPANISH, 20),
    ("French Cinema", "fr", settings.CATALOG_PAGES_FRENCH, 20),
]

def _looks_like_real_tmdb_hash(path: str) -> bool:
    """
    Real TMDb image hashes are always ~27 alphanumeric characters, so this
    format check catches the most obviously-fabricated seed values (e.g.
    "dangal.jpg", "uQ.jpg") and anything already pointing at our own
    fallback image. It's a first-pass filter, not proof of correctness —
    a wrong-but-correctly-shaped hash can still slip through — which is
    exactly why the bundled catalog (app/data/bundled_catalog.json) is
    sourced from verified TMDb data rather than relying on this check
    alone to catch every case.
    """
    if not path or FALLBACK_POSTER_URL in path or FALLBACK_BACKDROP_URL in path:
        return False
    hash_part = path.rstrip("/").split("/")[-1].split(".")[0]
    return bool(re.fullmatch(r"[A-Za-z0-9]{25,32}", hash_part))


async def heal_broken_posters(db: Session) -> Dict[str, int]:
    """
    Repairs movies whose poster/backdrop artwork never actually worked, by
    re-fetching the real poster/backdrop from TMDb using each movie's
    (trustworthy) tmdb_id and overwriting the bad value. Safe to run every
    startup / on demand — only touches entries that still look broken.

    Without a TMDB_API_KEY this can't re-fetch anything real, but it still
    does useful work: any candidate still pointing at a dead/fabricated
    path gets switched to the bundled fallback image so the UI never shows
    a broken `<img>`, instead of silently no-op'ing like before.

    Returns {"healed": n, "fell_back": n, "still_broken": n} so callers
    (startup logs, the admin repair endpoint) can report what happened
    instead of a single opaque count.
    """
    candidates = [
        m for m in db.query(Movie).filter(Movie.tmdb_id.isnot(None)).all()
        if not _looks_like_real_tmdb_hash(m.poster_path or "")
    ]
    result = {"healed": 0, "fell_back": 0, "still_broken": 0}
    if not candidates:
        return result

    for movie in candidates:
        details = await tmdb_service.get_movie_details(movie.tmdb_id) if tmdb_service.api_key else None

        if details and details.get("poster_path"):
            movie.poster_path = f"{TMDBService.IMAGE_BASE_URL}{details['poster_path']}"
            if details.get("backdrop_path"):
                movie.backdrop_path = f"{TMDBService.BACKDROP_BASE_URL}{details['backdrop_path']}"
            result["healed"] += 1
        else:
            # No key configured, or TMDb had nothing for this id — don't
            # leave a dead image path in place; use the shared fallback so
            # the card renders something intentional instead of a broken
            # <img>. Gets re-checked (and properly healed) next time this
            # runs with a working key.
            movie.poster_path = FALLBACK_POSTER_URL
            movie.backdrop_path = FALLBACK_BACKDROP_URL
            result["fell_back" if not tmdb_service.api_key else "still_broken"] += 1

    db.commit()
    return result

def backfill_vibe_tags(db: Session) -> int:
    """
    Repair pass, safe to run on every startup, for two related gaps:

    1. Movies with no vibe_tags at all (from before normalize_discover_result
       started setting them, or from an older local sqlite file) -- these
       silently excluded themselves from every vibe filter no matter what
       was selected.
    2. Movies that DO have vibe_tags but are missing "Bollywood" even though
       their genres include "Bollywood"/"South Indian" -- this covers
       titles seeded before the Bollywood vibe tag existed, so the
       "Bollywood" mood pill actually surfaces the full Hindi/South Indian
       catalog rather than just newly-synced titles.

    Cheap (no network calls).
    """
    all_movies = db.query(Movie).all()
    repaired = 0

    for movie in all_movies:
        genres_lower = [g.strip().lower() for g in (movie.genres or [])]
        is_industry_tagged = "bollywood" in genres_lower or "south indian" in genres_lower

        if not movie.vibe_tags:
            movie.vibe_tags = derive_vibe_tags(movie.genres or [], movie.overview or "")
            repaired += 1
        elif is_industry_tagged and "Bollywood" not in movie.vibe_tags:
            movie.vibe_tags = ["Bollywood"] + list(movie.vibe_tags)
            repaired += 1

    if repaired:
        db.commit()
        logger.info(f"Vibe-tag backfill repaired {repaired} movies (missing tags and/or missing Bollywood tag).")
    return repaired


async def sync_global_catalog(db: Session, force: bool = False) -> int:
    """
    Populates the local catalog from TMDb across multiple languages/film
    industries so browsing isn't capped at whatever was manually seeded.
    Safe to call repeatedly — dedupes by tmdb_id, skips if the catalog is
    already reasonably sized (unless force=True), and no-ops quietly if no
    TMDB_API_KEY is configured.

    Returns the number of newly-imported movies.
    """
    if not tmdb_service.api_key:
        logger.info("TMDB_API_KEY not configured — skipping catalog sync.")
        return 0

    existing_count = db.query(Movie).count()
    if not force and existing_count >= CATALOG_SIZE_THRESHOLD:
        logger.info(f"Catalog already has {existing_count} movies — skipping sync.")
        return 0

    genre_map = await tmdb_service.get_genre_map()
    id_to_name: Dict[int, str] = {v: k for k, v in genre_map.items()}
    if not id_to_name:
        logger.warning("Could not load TMDb genre list — aborting catalog sync.")
        return 0

    existing_tmdb_ids = {tid for (tid,) in db.query(Movie.tmdb_id).all()}
    existing_titles = {t.strip().lower() for (t,) in db.query(Movie.title).all()}
    imported = 0

    for label, lang, pages, min_votes in LANGUAGE_BUCKETS:
        for page in range(1, pages + 1):
            data = await tmdb_service.discover_movies(
                page=page, sort_by="popularity.desc", original_language=lang, min_vote_count=min_votes
            )
            if not data or not data.get("results"):
                continue

            for raw in data["results"]:
                normalized = normalize_discover_result(raw, id_to_name)
                if not normalized or normalized["tmdb_id"] in existing_tmdb_ids:
                    continue
                if normalized["title"].strip().lower() in existing_titles:
                    continue
                db.add(Movie(**normalized))
                existing_tmdb_ids.add(normalized["tmdb_id"])
                existing_titles.add(normalized["title"].strip().lower())
                imported += 1

        logger.info(f"[{label}] catalog sync pass complete — {imported} total imported so far.")

    if imported:
        db.commit()

    logger.info(f"Catalog sync finished: {imported} new movies imported.")
    return imported
