from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import Movie, User
from app.schemas.schemas import MovieResponse
from app.auth.deps import get_optional_user
from app.recommender.engine import recommender_engine

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/hybrid", response_model=List[MovieResponse])
def get_hybrid_recommendations(
    vibe: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    min_rating: float = Query(0.0),
    top_n: int = Query(15),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    movies = db.query(Movie).all()
    recs = recommender_engine.calculate_hybrid_scores(
        db=db,
        user=user,
        movies=movies,
        vibe_filter=vibe,
        genre_filter=genre,
        industry_filter=industry,
        min_rating=min_rating,
        top_n=top_n
    )
    
    result = []
    for item in recs:
        m = item["movie"]
        res = MovieResponse.from_orm(m)
        res.match_score = item["match_score"]
        res.recommendation_reason = item["recommendation_reason"]
        result.append(res)
        
    return result

@router.get("/trending", response_model=List[MovieResponse])
def get_trending_recommendations(db: Session = Depends(get_db)):
    movies = db.query(Movie).order_by(Movie.cineverse_score.desc()).limit(8).all()
    res_list = []
    for m in movies:
        res = MovieResponse.from_orm(m)
        res.match_score = 96.0
        res.recommendation_reason = "Trending top pick today"
        res_list.append(res)
    return res_list

@router.get("/spotlight", response_model=MovieResponse)
def get_spotlight_movie(db: Session = Depends(get_db)):
    spotlight = db.query(Movie).order_by(Movie.cineverse_score.desc()).first()
    if not spotlight:
        spotlight = db.query(Movie).first()
    res = MovieResponse.from_orm(spotlight)
    res.match_score = 99.4
    res.recommendation_reason = "Spotlight Pick of the Day — Exceptional direction, mind-bending plot, and unmatched visual execution."
    return res
