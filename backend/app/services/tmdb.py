import httpx
import time
import logging
from typing import List, Dict, Any, Optional
from app.config.settings import settings

logger = logging.getLogger("cineverse_tmdb")

# Single canonical fallback used everywhere a poster/backdrop genuinely has
# no working artwork (TMDb returned nothing, a fetch failed, or a seeded
# entry has no real TMDb hash yet). Previously this same Unsplash URL was
# hardcoded in three separate places (here twice, plus MovieDetailsModal.jsx
# on the frontend) which made it easy for them to drift; now there's one
# source of truth on the backend, and the frontend keeps its own local
# bundled fallback (frontend/public/fallback-poster.svg) as a second line of
# defense that doesn't depend on an external host being reachable.
FALLBACK_POSTER_URL = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80"
FALLBACK_BACKDROP_URL = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80"

# Simple in-memory Cache with TTL (Time-To-Live)
CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 3600 # 1 hour TTL

def _get_cache(key: str) -> Optional[Dict[str, Any]]:
    if key in CACHE:
        item = CACHE[key]
        if time.time() - item["timestamp"] < CACHE_TTL_SECONDS:
            return item["data"]
        else:
            del CACHE[key]
    return None

def _set_cache(key: str, data: Dict[str, Any]):
    CACHE[key] = {
        "timestamp": time.time(),
        "data": data
    }

class TMDBService:
    BASE_URL = "https://api.themoviedb.org/3"
    # NOTE: was "https://image.tmdb.org/t5/p/..." (typo'd "t5" segment) — this
    # 404'd for every poster/backdrop, which is why images were missing.
    IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
    BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280"

    def __init__(self):
        self.api_key = settings.TMDB_API_KEY

    async def _fetch_from_tmdb(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None

        cache_key = f"{endpoint}:{str(params)}"
        cached_result = _get_cache(cache_key)
        if cached_result:
            return cached_result

        request_params = {"api_key": self.api_key}
        if params:
            request_params.update(params)

        url = f"{self.BASE_URL}/{endpoint}"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.get(url, params=request_params)
                if response.status_code == 200:
                    data = response.json()
                    _set_cache(cache_key, data)
                    return data
                else:
                    logger.warning(f"TMDb API returned status code {response.status_code} for endpoint {endpoint}")
                    return None
        except Exception as e:
            logger.error(f"Error connecting to TMDb API: {e}")
            return None

    async def get_movie_details(self, tmdb_id: int) -> Optional[Dict[str, Any]]:
        endpoint = f"movie/{tmdb_id}"
        params = {"append_to_response": "videos,credits,watch/providers,similar"}
        return await self._fetch_from_tmdb(endpoint, params)

    async def search_tmdb(self, query: str, page: int = 1) -> Optional[Dict[str, Any]]:
        endpoint = "search/movie"
        params = {"query": query, "page": page, "include_adult": False}
        return await self._fetch_from_tmdb(endpoint, params)

    async def get_trending(self, time_window: str = "day") -> Optional[Dict[str, Any]]:
        endpoint = f"trending/movie/{time_window}"
        return await self._fetch_from_tmdb(endpoint)

    async def discover_movies(
        self,
        page: int = 1,
        genre_id: Optional[int] = None,
        sort_by: str = "popularity.desc",
        original_language: Optional[str] = None,
        min_vote_count: int = 20,
    ) -> Optional[Dict[str, Any]]:
        """
        Paginated browse across TMDb's full catalog (millions of titles),
        not just the locally-seeded set. 20 results per page, TMDb caps at
        page 500 (~10,000 movies per filter combination).

        `original_language` takes an ISO 639-1 code (e.g. "hi" for Hindi,
        "ko" for Korean) so non-English/regional cinema — Bollywood included
        — can be pulled in explicitly rather than relying on global
        popularity sorting, which skews heavily toward English-language
        blockbusters.

        `min_vote_count` filters out zero-vote junk entries, but regional
        industries (Tamil/Telugu/Malayalam/Kannada especially) get far fewer
        international TMDb votes than Hollywood titles at the same level of
        real popularity — the default of 20 was quietly starving exactly
        that content, so callers targeting Indian-language buckets pass a
        lower value.
        """
        endpoint = "discover/movie"
        params: Dict[str, Any] = {
            "page": max(1, min(page, 500)),
            "sort_by": sort_by,
            "include_adult": False,
            "vote_count.gte": max(0, min_vote_count),
        }
        if genre_id:
            params["with_genres"] = genre_id
        if original_language:
            params["with_original_language"] = original_language
        return await self._fetch_from_tmdb(endpoint, params)

    async def get_genre_map(self) -> Dict[str, int]:
        """Returns {genre_name: tmdb_genre_id}, e.g. {'Action': 28, ...}."""
        data = await self._fetch_from_tmdb("genre/movie/list")
        if not data:
            return {}
        return {g["name"]: g["id"] for g in data.get("genres", [])}

tmdb_service = TMDBService()

# ISO 639-1 code -> (readable language name, umbrella "industry" genre tag).
# Only Indian-industry languages get an industry tag — everything else just
# gets its readable-ish code back with no extra tag.
INDIAN_LANGUAGE_MAP: Dict[str, tuple] = {
    "hi": ("Hindi", "Bollywood"),
    "ta": ("Tamil", "South Indian"),
    "te": ("Telugu", "South Indian"),
    "ml": ("Malayalam", "South Indian"),
    "kn": ("Kannada", "South Indian"),
    "en": ("English", None),
    "ko": ("Korean", None),
    "ja": ("Japanese", None),
    "es": ("Spanish", None),
    "fr": ("French", None),
    "zh": ("Chinese", None),
}

# Deterministic genre/keyword -> vibe heuristic. Previously ONLY the ~44
# hand-curated movies in bundled_catalog.json had vibe_tags set; every movie
# pulled in from TMDb via catalog_sync got an empty vibe_tags list, which
# silently locked its vibe_score at a constant mismatch value no matter
# which vibe pill was selected. This backfills a reasonable vibe_tags list
# for every movie at ingest time so vibe filtering actually works across the
# whole catalog, not just the curated slice. Order matters slightly (a movie
# can and often should get more than one tag).
_GENRE_TO_VIBES = {
    "action": ["Adrenaline Rush"],
    "adventure": ["Adrenaline Rush"],
    "war": ["Dark & Gritty", "Thought-Provoking"],
    "thriller": ["Dark & Gritty", "Adrenaline Rush"],
    "crime": ["Dark & Gritty"],
    "mystery": ["Dark & Gritty", "Mind-Bending"],
    "horror": ["Dark & Gritty"],
    "science fiction": ["Mind-Bending"],
    "sci-fi": ["Mind-Bending"],
    "fantasy": ["Mind-Bending"],
    "comedy": ["Feel-Good"],
    "family": ["Feel-Good"],
    "animation": ["Feel-Good"],
    "music": ["Feel-Good"],
    "romance": ["Feel-Good"],
    "drama": ["Thought-Provoking"],
    "history": ["Thought-Provoking"],
    "documentary": ["Thought-Provoking"],
}
_CYBERPUNK_KEYWORDS = (
    "cyberpunk", "dystopian", "artificial intelligence", "android", "hacker",
    "cyborg", "neon", "virtual reality", "robot", "future city", "corporate dystopia",
)


def derive_vibe_tags(genres: List[str], overview: str = "") -> List[str]:
    """Maps a movie's TMDb genre list (+ overview text) to our internal vibe
    taxonomy. Runs for every movie ingested via catalog_sync so vibe filters
    have real, catalog-wide signal instead of only working on the curated
    seed set. Always returns at least one tag."""
    tags: List[str] = []
    for g in genres or []:
        for vibe in _GENRE_TO_VIBES.get(g.strip().lower(), []):
            if vibe not in tags:
                tags.append(vibe)

    overview_lower = (overview or "").lower()
    if any(kw in overview_lower for kw in _CYBERPUNK_KEYWORDS):
        if "Cyberpunk" not in tags:
            tags.append("Cyberpunk")

    # "Bollywood" is also a first-class vibe/mood option in the UI (the
    # vibe pill bar, CineBot's mood detection) -- not just a genre badge.
    # Previously there was no way to actually browse/filter *for* Hindi or
    # South Indian cinema by mood, only stumble into it via the generic
    # genre chips on the Discover page. Tag it explicitly here so selecting
    # the "Bollywood" vibe pulls in every Hindi/South Indian title in the
    # catalog, not just the handful that happened to also match a thematic
    # vibe like "Feel-Good".
    genres_lower = [g.strip().lower() for g in (genres or [])]
    if "bollywood" in genres_lower or "south indian" in genres_lower:
        tags.insert(0, "Bollywood")

    if not tags:
        tags.append("Thought-Provoking")  # safe, broadly-applicable default

    # Dedup while preserving order (Bollywood insert above can collide with
    # itself on rare double-industry-tag inputs).
    seen = set()
    deduped = []
    for t in tags:
        if t not in seen:
            seen.add(t)
            deduped.append(t)

    return deduped[:4]


def normalize_discover_result(raw: Dict[str, Any], genre_id_to_name: Dict[int, str]) -> Optional[Dict[str, Any]]:
    """
    Converts one raw TMDb discover/search list item into the fields our
    Movie model needs. Discover/search results are lightweight (no runtime,
    cast, or director — those require a per-movie detail call), so those
    fields are left as safe defaults and can be backfilled lazily when the
    user opens the movie's detail view.

    Movies from major Indian film industries get an explicit umbrella genre
    tag ("Bollywood" for Hindi, "South Indian" for Tamil/Telugu/Malayalam/
    Kannada) and a readable language name, matching the convention already
    used in the hand-seeded catalog — this is what lets the Home page group
    and surface them properly instead of them blending into "everything
    else" by TMDb genre alone.
    """
    if not raw.get("title") or not raw.get("id"):
        return None

    release_date = raw.get("release_date") or ""
    try:
        release_year = int(release_date[:4]) if release_date else 0
    except ValueError:
        release_year = 0

    poster_path = (
        f"{TMDBService.IMAGE_BASE_URL}{raw['poster_path']}"
        if raw.get("poster_path")
        else FALLBACK_POSTER_URL
    )
    backdrop_path = (
        f"{TMDBService.BACKDROP_BASE_URL}{raw['backdrop_path']}"
        if raw.get("backdrop_path")
        else None
    )

    genre_names = [genre_id_to_name[g] for g in raw.get("genre_ids", []) if g in genre_id_to_name]

    lang_code = (raw.get("original_language") or "en").lower()
    lang_name, industry_tag = INDIAN_LANGUAGE_MAP.get(lang_code, (lang_code.upper(), None))
    if industry_tag:
        genre_names = [industry_tag] + [g for g in genre_names if g != industry_tag]

    return {
        "tmdb_id": raw["id"],
        "title": raw["title"],
        "overview": raw.get("overview") or "No synopsis available yet.",
        "release_year": release_year or 2000,
        "runtime": 0,  # backfilled on first detail view via get_movie_details()
        "poster_path": poster_path,
        "backdrop_path": backdrop_path,
        "imdb_rating": round(raw.get("vote_average", 0) or 0, 1),
        "cineverse_score": round((raw.get("vote_average", 0) or 0) * 0.95, 1),
        "genres": genre_names,
        "vibe_tags": derive_vibe_tags(genre_names, raw.get("overview") or ""),
        "language": lang_name,
    }

def enrich_movie_dict(movie_dict: Dict[str, Any], tmdb_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Enriches a movie dictionary with normalized TMDb metadata or fallback artwork.
    Does not alter core ML recommendation scores.
    """
    if not tmdb_data:
        # Fallback poster / backdrop validation
        if not movie_dict.get("poster_path") or "unsplash" in movie_dict.get("poster_path", ""):
            movie_dict["poster_path"] = FALLBACK_POSTER_URL
        return movie_dict

    # TMDb Posters & Backdrops
    if tmdb_data.get("poster_path"):
        movie_dict["poster_path"] = f"{TMDBService.IMAGE_BASE_URL}{tmdb_data['poster_path']}"
    if tmdb_data.get("backdrop_path"):
        movie_dict["backdrop_path"] = f"{TMDBService.BACKDROP_BASE_URL}{tmdb_data['backdrop_path']}"

    # Metadata fields
    if tmdb_data.get("tagline"):
        movie_dict["tagline"] = tmdb_data["tagline"]
    if tmdb_data.get("overview"):
        movie_dict["overview"] = tmdb_data["overview"]
    if tmdb_data.get("runtime"):
        movie_dict["runtime"] = tmdb_data["runtime"]
    if tmdb_data.get("vote_average"):
        movie_dict["imdb_rating"] = round(tmdb_data["vote_average"], 1)

    # Cast & Director
    credits = tmdb_data.get("credits", {})
    if credits.get("cast"):
        movie_dict["cast"] = [c["name"] for c in credits["cast"][:5]]
    if credits.get("crew"):
        directors = [c["name"] for c in credits["crew"] if c.get("job") == "Director"]
        if directors:
            movie_dict["director"] = ", ".join(directors)

    # Official YouTube Trailer
    videos = tmdb_data.get("videos", {}).get("results", [])
    for vid in videos:
        if vid.get("site") == "YouTube" and vid.get("type") in ["Trailer", "Teaser"]:
            movie_dict["trailer_url"] = f"https://www.youtube.com/embed/{vid['key']}"
            break

    # Watch Providers
    providers = tmdb_data.get("watch/providers", {}).get("results", {}).get("US", {}).get("flatrate", [])
    if providers:
        movie_dict["streaming_providers"] = [p["provider_name"] for p in providers[:3]]

    return movie_dict
