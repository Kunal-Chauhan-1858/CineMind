from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import Movie
from app.schemas.schemas import MovieResponse
from app.services.tmdb import tmdb_service, enrich_movie_dict
from app.services.search_service import search_movies

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("", response_model=List[MovieResponse])
async def multi_category_search(
    q: str = Query(..., min_length=1),
    genre: Optional[str] = None,
    year: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    # Fetch a generous window then paginate in-memory (search_service already
    # ranks title/overview/director/cast/keyword matches; skip/limit here
    # just windows into that combined result set).
    unique_movies = search_movies(db, q=q, genre=genre, year=year, limit=skip + limit + 1)
    paginated = unique_movies[skip : skip + limit]

    result = []
    for m in paginated:
        res = MovieResponse.from_orm(m)
        res.recommendation_reason = f"Search match for query '{q}'"
        result.append(res)

    return result
