from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import Movie, Genre
from app.schemas.schemas import MovieResponse
from app.recommender.engine import recommender_engine
from app.services.tmdb import tmdb_service, normalize_discover_result
from app.services.search_service import search_movies
from pydantic import BaseModel

router = APIRouter(prefix="/movies", tags=["Movies"])

class DiscoverResponse(BaseModel):
    movies: List[MovieResponse]
    page: int
    total_pages: int

VIBES_LIST = ["Mind-Bending", "Adrenaline Rush", "Dark & Gritty", "Feel-Good", "Thought-Provoking", "Cyberpunk"]

@router.get("", response_model=List[MovieResponse])
async def get_movies(
    q: Optional[str] = None,
    genre: Optional[str] = None,
    vibe: Optional[str] = None,
    min_rating: float = 0.0,
    sort_by: str = "cineverse_score", # cineverse_score, release_year, imdb_rating
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Previously this only matched title/overview/director via ILIKE, so a
    # search for an actor's name (which the navbar's autocomplete DOES
    # match, via search_service) returned nothing here -- same query,
    # different results depending on which search box you used. Both now
    # go through the same search_movies() logic (title/overview/director/
    # cast/keywords).
    if q:
        movies = search_movies(db, q=q, limit=1000)
    else:
        movies = db.query(Movie).all()

    if min_rating > 0:
        movies = [m for m in movies if (m.cineverse_score or 0) >= min_rating]

    if sort_by == "release_year":
        movies.sort(key=lambda m: m.release_year or 0, reverse=True)
    elif sort_by == "imdb_rating":
        movies.sort(key=lambda m: m.imdb_rating or 0, reverse=True)
    else:
        movies.sort(key=lambda m: m.cineverse_score or 0, reverse=True)

    # A text search that comes up thin locally falls back to a live TMDb
    # title search and imports any matches — this is what makes searching
    # for a movie that isn't in the local catalog yet (Bollywood titles,
    # foreign-language films, anything TMDb has but we haven't imported)
    # actually find something instead of returning an empty result.
    if q and len(movies) < 5 and tmdb_service.api_key:
        tmdb_data = await tmdb_service.search_tmdb(q)
        if tmdb_data and tmdb_data.get("results"):
            genre_map = await tmdb_service.get_genre_map()
            id_to_name = {v: k for k, v in genre_map.items()}
            existing_ids = {m.id for m in movies}
            existing_tmdb_ids = {m.tmdb_id for m in movies}
            existing_titles = {m.title.strip().lower() for m in movies}

            for raw in tmdb_data["results"][:20]:
                normalized = normalize_discover_result(raw, id_to_name)
                if not normalized or normalized["tmdb_id"] in existing_tmdb_ids:
                    continue
                existing_row = db.query(Movie).filter(Movie.tmdb_id == normalized["tmdb_id"]).first()
                if not existing_row and normalized["title"].strip().lower() in existing_titles:
                    # Defensive guard: same title already present locally
                    # (e.g. seeded under a slightly different tmdb_id) —
                    # don't create a visible duplicate card for it.
                    continue
                if existing_row:
                    if existing_row.id not in existing_ids:
                        movies.append(existing_row)
                        existing_ids.add(existing_row.id)
                    continue
                new_movie = Movie(**normalized)
                db.add(new_movie)
                db.flush()  # assigns new_movie.id without a full commit yet
                movies.append(new_movie)
                existing_tmdb_ids.add(normalized["tmdb_id"])
                existing_titles.add(normalized["title"].strip().lower())

            db.commit()

    # Python-level filter for JSON list fields (genres & vibe_tags) for 100% SQLite/Postgres cross compatibility
    if genre and genre.lower() != "all":
        movies = [m for m in movies if m.genres and any(genre.lower() == g.lower() for g in m.genres)]
        
    if vibe and vibe.lower() != "any":
        movies = [m for m in movies if m.vibe_tags and any(vibe.lower() in v.lower() for v in m.vibe_tags)]

    paginated_movies = movies[skip : skip + limit]
    return [MovieResponse.from_orm(m) for m in paginated_movies]

@router.get("/genres", response_model=List[str])
def get_genres(db: Session = Depends(get_db)):
    genres = db.query(Genre).all()
    return [g.name for g in genres]

@router.get("/vibes", response_model=List[str])
def get_vibes():
    return VIBES_LIST

@router.get("/discover", response_model=DiscoverResponse)
async def discover_movies(
    page: int = Query(1, ge=1, le=500),
    genre: Optional[str] = None,
    sort_by: str = "popularity.desc",
    db: Session = Depends(get_db),
):
    """
    Live-browses TMDb's full catalog (not just the locally seeded titles),
    so the app isn't capped at a handful of preloaded movies. Each page is
    imported into the local database on first view (deduped by tmdb_id) so
    it becomes ratable/watchlist-able/recommendable like any other title.
    Requires TMDB_API_KEY to be configured — returns 503 if it's missing.
    """
    if not tmdb_service.api_key:
        raise HTTPException(
            status_code=503,
            detail="TMDB_API_KEY is not configured on the server, so live catalog browsing is unavailable."
        )

    genre_map = await tmdb_service.get_genre_map()
    genre_id = genre_map.get(genre) if genre and genre.lower() != "all" else None

    data = await tmdb_service.discover_movies(page=page, genre_id=genre_id, sort_by=sort_by)
    if not data:
        raise HTTPException(status_code=502, detail="Could not reach TMDb right now. Try again shortly.")

    id_to_name = {v: k for k, v in genre_map.items()}
    results = data.get("results", [])

    ordered_tmdb_ids = []
    for raw in results:
        normalized = normalize_discover_result(raw, id_to_name)
        if not normalized:
            continue
        ordered_tmdb_ids.append(normalized["tmdb_id"])

        existing = db.query(Movie).filter(Movie.tmdb_id == normalized["tmdb_id"]).first()
        if existing:
            continue  # already imported — don't clobber any local edits (ratings/reviews reference it)

        db.add(Movie(**normalized))

    db.commit()

    movies_by_tmdb_id = {
        m.tmdb_id: m
        for m in db.query(Movie).filter(Movie.tmdb_id.in_(ordered_tmdb_ids)).all()
    }
    ordered_movies = [movies_by_tmdb_id[tid] for tid in ordered_tmdb_ids if tid in movies_by_tmdb_id]

    return DiscoverResponse(
        movies=[MovieResponse.from_orm(m) for m in ordered_movies],
        page=data.get("page", page),
        total_pages=min(data.get("total_pages", page), 500),
    )

@router.get("/{movie_id}", response_model=MovieResponse)
def get_movie_detail(movie_id: int, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return MovieResponse.from_orm(movie)

@router.get("/{movie_id}/similar", response_model=List[MovieResponse])
def get_similar_movies(movie_id: int, top_n: int = 6, db: Session = Depends(get_db)):
    movies = db.query(Movie).all()
    recs = recommender_engine.get_content_recommendations(movie_id, movies, top_n=top_n)
    
    movie_dict = {m.id: m for m in movies}
    similar_movies = []
    for m_id, score in recs:
        if m_id in movie_dict:
            m = movie_dict[m_id]
            m_res = MovieResponse.from_orm(m)
            m_res.match_score = round(score * 100, 1)
            m_res.recommendation_reason = f"High content similarity match ({m_res.match_score}%)"
            similar_movies.append(m_res)
    return similar_movies
