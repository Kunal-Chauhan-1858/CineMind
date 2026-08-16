from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import re
from app.database.session import get_db
from app.models.models import Rating, Review, Favorite, Watchlist, Movie, User
from app.schemas.schemas import (
    RatingCreate, RatingResponse, ReviewCreate, ReviewResponse,
    WatchlistUpdate, WatchlistResponse, FavoriteResponse, MovieResponse
)
from app.auth.deps import get_current_user

router = APIRouter(prefix="/interactions", tags=["Interactions"])

# React already escapes text content on render (reviews are rendered as
# plain JSX text, not via dangerouslySetInnerHTML), so this isn't currently
# exploitable in the app's own UI. Stripping tags server-side is still
# worthwhile defense-in-depth: it protects any other consumer of this data
# (a future export/email feature, the admin dashboard, a different
# frontend) that might not escape on render the way React does.
_HTML_TAG_RE = re.compile(r"<[^>]*>")

def _sanitize_review_text(text: str) -> str:
    return _HTML_TAG_RE.sub("", text or "").strip()

# --- Ratings ---
@router.post("/ratings", response_model=RatingResponse)
def add_or_update_rating(
    rating_in: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Rating).filter(
        Rating.user_id == current_user.id,
        Rating.movie_id == rating_in.movie_id
    ).first()
    
    if existing:
        existing.score = rating_in.score
        db.commit()
        db.refresh(existing)
        return existing
        
    new_rating = Rating(
        user_id=current_user.id,
        movie_id=rating_in.movie_id,
        score=rating_in.score
    )
    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)
    return new_rating

# --- Reviews ---
@router.post("/reviews", response_model=ReviewResponse)
def create_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_review = Review(
        user_id=current_user.id,
        movie_id=review_in.movie_id,
        review_text=_sanitize_review_text(review_in.review_text),
        contains_spoilers=review_in.contains_spoilers
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    return ReviewResponse(
        id=new_review.id,
        user_id=new_review.user_id,
        movie_id=new_review.movie_id,
        review_text=new_review.review_text,
        contains_spoilers=new_review.contains_spoilers,
        likes_count=new_review.likes_count,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        created_at=new_review.created_at
    )

@router.get("/reviews/movie/{movie_id}", response_model=List[ReviewResponse])
def get_movie_reviews(movie_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.movie_id == movie_id).order_by(Review.created_at.desc()).all()
    res = []
    for r in reviews:
        user = db.query(User).filter(User.id == r.user_id).first()
        res.append(ReviewResponse(
            id=r.id,
            user_id=r.user_id,
            movie_id=r.movie_id,
            review_text=r.review_text,
            contains_spoilers=r.contains_spoilers,
            likes_count=r.likes_count,
            username=user.username if user else "Anonymous",
            avatar_url=user.avatar_url if user else None,
            created_at=r.created_at
        ))
    return res

# --- Watchlist ---
@router.post("/watchlist", response_model=WatchlistResponse)
def update_watchlist(
    item_in: WatchlistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.movie_id == item_in.movie_id
    ).first()
    
    if existing:
        existing.status = item_in.status
        db.commit()
        db.refresh(existing)
        return existing
        
    new_item = Watchlist(
        user_id=current_user.id,
        movie_id=item_in.movie_id,
        status=item_in.status
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/watchlist", response_model=List[WatchlistResponse])
def get_user_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    res = []
    for item in items:
        m = db.query(Movie).filter(Movie.id == item.movie_id).first()
        if m:
            res.append(WatchlistResponse(
                id=item.id,
                user_id=item.user_id,
                movie_id=item.movie_id,
                status=item.status,
                movie=MovieResponse.from_orm(m),
                updated_at=item.updated_at
            ))
    return res

@router.delete("/watchlist/{movie_id}")
def remove_from_watchlist(
    movie_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.movie_id == movie_id
    ).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Removed from watchlist"}

# --- Favorites ---
@router.post("/favorites/toggle/{movie_id}")
def toggle_favorite(
    movie_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fav = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.movie_id == movie_id
    ).first()
    
    if fav:
        db.delete(fav)
        db.commit()
        return {"is_favorite": False}
    else:
        new_fav = Favorite(user_id=current_user.id, movie_id=movie_id)
        db.add(new_fav)
        db.commit()
        return {"is_favorite": True}

@router.get("/favorites", response_model=List[MovieResponse])
def get_user_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    favs = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
    fav_movie_ids = [f.movie_id for f in favs]
    movies = db.query(Movie).filter(Movie.id.in_(fav_movie_ids)).all()
    return [MovieResponse.from_orm(m) for m in movies]
