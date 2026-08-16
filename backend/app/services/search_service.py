from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import Movie


def search_movies(
    db: Session,
    q: str,
    genre: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = 20,
) -> List[Movie]:
    """
    Fans a free-text query out across title, overview, director, cast, and
    keywords. Pulled out of app/api/search.py so the exact same real search
    logic can be reused by CineBot (app/chatbot/assistant.py) instead of the
    chatbot only being able to match a fixed list of vibe/genre keywords and
    silently ignoring anything else the user typed (e.g. an actual movie or
    actor name).
    """
    query_term = f"%{q.lower()}%"

    query = db.query(Movie).filter(
        (Movie.title.ilike(query_term))
        | (Movie.overview.ilike(query_term))
        | (Movie.director.ilike(query_term))
    )
    movies = query.all()

    # In-memory match for JSON fields (cast, keywords, genres) that ilike()
    # can't reach directly.
    all_movies = db.query(Movie).all()
    matched_ids = {m.id for m in movies}
    for m in all_movies:
        if m.id in matched_ids:
            continue
        if m.cast and any(q.lower() in actor.lower() for actor in m.cast):
            movies.append(m)
        elif m.keywords and any(q.lower() in kw.lower() for kw in m.keywords):
            movies.append(m)

    if genre and genre.lower() != "all":
        movies = [m for m in movies if m.genres and any(genre.lower() == g.lower() for g in m.genres)]

    if year:
        movies = [m for m in movies if m.release_year == year]

    seen_ids = set()
    unique_movies = []
    for m in movies:
        if m.id not in seen_ids:
            seen_ids.add(m.id)
            unique_movies.append(m)

    return unique_movies[:limit]
