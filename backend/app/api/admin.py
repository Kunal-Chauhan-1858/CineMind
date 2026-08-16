from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database.session import get_db
from app.models.models import User, Movie, Rating, Review, Watchlist
from app.schemas.schemas import UserResponse, ReviewResponse
from app.auth.deps import get_current_user
from app.services.tmdb import CACHE, tmdb_service
from app.services.catalog_sync import sync_global_catalog, heal_broken_posters

router = APIRouter(prefix="/admin", tags=["Admin"])

def verify_admin(current_user: User = Depends(get_current_user)):
    if not current_user or not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

@router.get("/analytics")
def get_system_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    total_users = db.query(User).count()
    total_movies = db.query(Movie).count()
    total_ratings = db.query(Rating).count()
    total_reviews = db.query(Review).count()
    total_watchlist = db.query(Watchlist).count()

    return {
        "system_status": "Healthy",
        "total_users": total_users,
        "total_movies": total_movies,
        "total_ratings": total_ratings,
        "total_reviews": total_reviews,
        "total_watchlist_items": total_watchlist,
        "tmdb_cache_entries": len(CACHE),
        "api_health": {
            "tmdb_proxy": "Operational",
            "ml_recommendation_engine": "Operational",
            "database_connection": "Operational"
        }
    }

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    return db.query(User).all()

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete superadmin user")
        
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted successfully"}

@router.delete("/reviews/{review_id}")
def moderate_delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
        
    db.delete(review)
    db.commit()
    return {"message": f"Review {review_id} removed by moderator"}

@router.post("/sync-catalog")
async def force_sync_catalog(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    """
    Manually re-runs the multi-language TMDb catalog import (global popular,
    Bollywood/Hindi, Korean, Japanese, Spanish, French, etc.) and repairs any
    movies with broken poster/backdrop artwork, without restarting the
    server. Live TMDb import requires TMDB_API_KEY; poster repair still
    falls back to the bundled placeholder image without one.
    """
    poster_result = await heal_broken_posters(db)
    imported = await sync_global_catalog(db, force=True)
    return {
        "message": (
            f"Sync complete — repaired {poster_result['healed']} poster(s) with real TMDb art, "
            f"{poster_result['fell_back'] + poster_result['still_broken']} given the fallback image, "
            f"imported {imported} new movie(s)."
        ),
        "poster_repair": poster_result,
        "newly_imported": imported,
        "total_movies": db.query(Movie).count()
    }

@router.post("/repair-broken-posters")
async def repair_broken_posters(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    """
    Dedicated, targeted version of the poster-repair half of /sync-catalog
    — re-checks every movie's poster/backdrop and either re-fetches the
    real artwork from TMDb (if TMDB_API_KEY is configured) or assigns the
    bundled fallback image, without also running a full catalog import.
    Use this to re-check artwork on demand (e.g. after adding a
    TMDB_API_KEY, or after noticing a broken card) rather than waiting for
    the next server restart.
    """
    poster_result = await heal_broken_posters(db)
    return {
        "message": (
            f"Repaired {poster_result['healed']} poster(s) with real TMDb art. "
            f"{poster_result['fell_back']} given the fallback image (no TMDB_API_KEY configured). "
            f"{poster_result['still_broken']} still broken despite a live TMDb lookup (unlikely tmdb_id)."
        ),
        **poster_result,
        "tmdb_api_key_configured": bool(tmdb_service.api_key),
    }
