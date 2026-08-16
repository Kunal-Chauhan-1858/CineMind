from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    preferred_genres = Column(JSON, default=list) # e.g. ["Sci-Fi", "Action", "Thriller"]
    favorite_directors = Column(JSON, default=list)
    favorite_actors = Column(JSON, default=list)
    preferred_vibes = Column(JSON, default=list) # e.g. ["Mind-Bending", "Feel-Good"]
    
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ratings = relationship("Rating", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    recommendation_histories = relationship("RecommendationHistory", back_populates="user", cascade="all, delete-orphan")
    search_histories = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")
    chat_histories = relationship("AIChatHistory", back_populates="user", cascade="all, delete-orphan")


class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)


class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, nullable=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    tagline = Column(String(500), nullable=True)
    overview = Column(Text, nullable=False)
    release_year = Column(Integer, nullable=False, index=True)
    runtime = Column(Integer, nullable=False) # minutes
    poster_path = Column(String(500), nullable=False)
    backdrop_path = Column(String(500), nullable=True)
    trailer_url = Column(String(500), nullable=True)
    
    imdb_rating = Column(Float, default=7.0)
    cineverse_score = Column(Float, default=8.5) # AI score
    
    genres = Column(JSON, default=list) # e.g. ["Action", "Sci-Fi"]
    director = Column(String(255), nullable=True)
    cast = Column(JSON, default=list) # e.g. ["Leonardo DiCaprio", "Joseph Gordon-Levitt"]
    keywords = Column(JSON, default=list)
    vibe_tags = Column(JSON, default=list) # e.g. ["Mind-Bending", "Cyberpunk", "Dark"]
    streaming_providers = Column(JSON, default=list) # e.g. ["Netflix", "Prime Video"]
    
    language = Column(String(50), default="English")
    country = Column(String(100), default="USA")
    created_at = Column(DateTime, default=datetime.utcnow)

    ratings = relationship("Rating", back_populates="movie", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="movie", cascade="all, delete-orphan")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False) # 1.0 to 5.0
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="ratings")
    movie = relationship("Movie", back_populates="ratings")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    review_text = Column(Text, nullable=False)
    contains_spoilers = Column(Boolean, default=False)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reviews")
    movie = relationship("Movie", back_populates="reviews")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="favorites")
    movie = relationship("Movie", back_populates="movies") if hasattr(Movie, 'favorites') else relationship("Movie")


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="want_to_watch") # want_to_watch, watching, completed, dropped
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="watchlist")
    movie = relationship("Movie")


class RecommendationHistory(Base):
    __tablename__ = "recommendation_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    algorithm = Column(String(100), default="hybrid")
    match_score = Column(Float, default=95.0)
    reason = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recommendation_histories")
    movie = relationship("Movie")


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    query = Column(String(255), nullable=False)
    search_type = Column(String(50), default="text") # text, semantic, voice
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="search_histories")


class AIChatHistory(Base):
    __tablename__ = "ai_chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False) # user, assistant
    message = Column(Text, nullable=False)
    suggested_movie_ids = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chat_histories")
