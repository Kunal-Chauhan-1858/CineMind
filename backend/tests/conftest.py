"""
Shared pytest fixtures.

Deliberately does NOT import app.main directly -- importing that module
triggers catalog seeding and (via its lifespan) live TMDb network calls,
neither of which belong in a test suite that has to run offline and
deterministically in CI. Instead this builds a fresh FastAPI app that wires
up the same routers against an isolated, file-based SQLite test database and
seeds only the small, purpose-built fixture catalog defined below.
"""
import os
import tempfile
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import Base, get_db
from app.models.models import Movie, User
from app.auth.security import get_password_hash
from app.api import auth, interactions, recommendations, chatbot


@pytest.fixture()
def db_session():
    """A fresh SQLite file per test, so tests never share state."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session, TestingSessionLocal
    finally:
        session.close()
        engine.dispose()
        os.remove(path)


# A small, purpose-built catalog covering exactly the combinations the
# regression tests below need: distinct vibes (so A1's "vibes actually
# reorder results" regression is checkable), a Bollywood comedy alongside a
# non-Bollywood comedy and a non-comedy Bollywood movie (so A3's combined
# industry+genre filter regression is checkable), and a couple of
# high/low-rated titles for the min_rating path.
FIXTURE_MOVIES = [
    dict(
        tmdb_id=1, title="Neon Circuit", overview="A hacker plunges into a dystopian neon-lit underworld.",
        release_year=2019, runtime=120, poster_path="p1.jpg",
        imdb_rating=8.5, cineverse_score=8.7,
        genres=["Sci-Fi"], director="A Director", cast=["Actor One"], keywords=["hacker"],
        vibe_tags=["Cyberpunk"],
    ),
    dict(
        tmdb_id=2, title="Warm Sunday Mornings", overview="A cozy small-town story about found family.",
        release_year=2015, runtime=100, poster_path="p2.jpg",
        imdb_rating=7.9, cineverse_score=8.0,
        genres=["Drama"], director="B Director", cast=["Actor Two"], keywords=["family"],
        vibe_tags=["Feel-Good"],
    ),
    dict(
        tmdb_id=3, title="Dilwale Dance Riot", overview="A big joyful Bollywood comedy about two feuding families.",
        release_year=2018, runtime=140, poster_path="p3.jpg",
        imdb_rating=7.5, cineverse_score=7.8,
        genres=["Bollywood", "Comedy"], director="C Director", cast=["Actor Three"], keywords=["wedding"],
        vibe_tags=["Feel-Good", "Bollywood"],
    ),
    dict(
        tmdb_id=4, title="Mumbai Nights", overview="A tense Bollywood crime drama set across one night in Mumbai.",
        release_year=2020, runtime=130, poster_path="p4.jpg",
        imdb_rating=8.2, cineverse_score=8.4,
        genres=["Bollywood", "Thriller"], director="D Director", cast=["Actor Four"], keywords=["crime"],
        vibe_tags=["Dark & Gritty", "Bollywood"],
    ),
    dict(
        tmdb_id=5, title="Laugh Track", overview="A very silly, very Western workplace comedy.",
        release_year=2021, runtime=95, poster_path="p5.jpg",
        imdb_rating=6.8, cineverse_score=7.0,
        genres=["Comedy"], director="E Director", cast=["Actor Five"], keywords=["office"],
        vibe_tags=["Feel-Good"],
    ),
]


def seed_fixture_movies(db):
    for data in FIXTURE_MOVIES:
        db.add(Movie(**data))
    db.commit()


def build_test_app(session_factory):
    """A minimal app exposing only the routers under test, with get_db
    overridden to the isolated test session factory."""
    app = FastAPI()
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(interactions.router, prefix="/api/v1")
    app.include_router(recommendations.router, prefix="/api/v1")
    app.include_router(chatbot.router, prefix="/api/v1")

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return app


@pytest.fixture()
def client(db_session):
    session, session_factory = db_session
    seed_fixture_movies(session)
    app = build_test_app(session_factory)
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def existing_user(db_session):
    """A pre-created user + raw password, for tests that need a guaranteed
    duplicate-email/username collision or a known login."""
    session, _ = db_session
    user = User(
        email="taken@cinemind.app",
        username="taken_user",
        hashed_password=get_password_hash("CorrectHorse1"),
        full_name="Taken User",
        preferred_genres=[],
        preferred_vibes=[],
    )
    session.add(user)
    session.commit()
    return user
