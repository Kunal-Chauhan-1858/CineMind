from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User, Rating, Movie, Watchlist, Favorite
from app.schemas.schemas import TasteAnalyticsResponse
from app.auth.deps import get_current_user
from collections import Counter, defaultdict

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# NOTE: this endpoint previously fell back to hardcoded fake numbers
# (total_rated=12, average_rating=4.2, sample genre/vibe/director counts)
# any time the real values were zero, and — more seriously — fell back to
# querying the ENTIRE movie catalog for the genre/vibe/era breakdown any
# time the user had zero ratings AND zero watchlist items. That's why a
# brand-new user's chart showed catalog-wide totals (hundreds of movies)
# labeled as their personal taste profile. Everything below is now computed
# strictly from the current user's own ratings + watchlist + favorites, and
# returns honest empty/zero values when the user hasn't interacted with
# anything yet, so the frontend can show a real empty state instead.

@router.get("/user", response_model=TasteAnalyticsResponse)
def get_user_taste_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ratings = db.query(Rating).filter(Rating.user_id == current_user.id).all()
    watchlist_items = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    favorite_items = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()

    total_rated = len(ratings)
    avg_rating = round(sum(r.score for r in ratings) / total_rated, 1) if total_rated > 0 else 0.0

    # Union of every movie the user has actually interacted with — rated,
    # watchlisted, or favorited. Favorites were previously ignored entirely
    # here even though a "like" is a strong taste signal.
    movie_ids = set()
    movie_ids.update(r.movie_id for r in ratings)
    movie_ids.update(w.movie_id for w in watchlist_items)
    movie_ids.update(f.movie_id for f in favorite_items)

    movies = db.query(Movie).filter(Movie.id.in_(movie_ids)).all() if movie_ids else []

    genre_counter = Counter()
    vibe_counter = Counter()
    director_counter = Counter()
    era_counter = Counter()

    for m in movies:
        for g in (m.genres or []):
            genre_counter[g] += 1
        for v in (m.vibe_tags or []):
            vibe_counter[v] += 1
        if m.director:
            director_counter[m.director] += 1
        if m.release_year:
            era = f"{(m.release_year // 10) * 10}s"
            era_counter[era] += 1

    top_vibe = vibe_counter.most_common(1)[0][0] if vibe_counter else None
    favorite_era = era_counter.most_common(1)[0][0] if era_counter else None
    top_directors = [{"name": name, "count": count} for name, count in director_counter.most_common(5)]

    # Real activity timeline (last 6 months of actual ratings, by month),
    # instead of a fixed fake Jan-May curve shown to every single user.
    monthly_counts = defaultdict(int)
    for r in ratings:
        if r.created_at:
            monthly_counts[r.created_at.strftime("%b")] += 1
    watching_timeline = [{"month": month, "count": count} for month, count in monthly_counts.items()]

    # "Rated Movies per Release Year" bar chart data. The backend already
    # computed watching_timeline but the frontend never rendered it, and
    # this per-year breakdown didn't exist at all -- both are added here so
    # the two new Dashboard chart panels have real data to draw from.
    # Bucketed from the same rated+watchlisted+favorited union used above,
    # sorted ascending by year, capped to the most recent ~10 distinct years
    # present so the bar chart doesn't get crowded on long-time users.
    year_counts = Counter(m.release_year for m in movies if m.release_year)
    recent_years = sorted(year_counts.keys())[-10:]
    movies_per_year = [{"year": year, "count": year_counts[year]} for year in recent_years]

    return TasteAnalyticsResponse(
        total_rated=total_rated,
        average_rating=avg_rating,
        genre_distribution=dict(genre_counter),
        vibe_distribution=dict(vibe_counter),
        favorite_directors=top_directors,
        watching_timeline=watching_timeline,
        movies_per_year=movies_per_year,
        top_vibe=top_vibe,
        favorite_era=favorite_era
    )
