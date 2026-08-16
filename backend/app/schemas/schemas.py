from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional, Any
from datetime import datetime

# --- Auth & User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    # Never trust client-side validation alone -- the frontend also checks
    # this, but signup requests can bypass the UI entirely, so the real
    # enforcement has to live here.
    @field_validator("password")
    @classmethod
    def password_must_be_reasonably_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one letter and one number")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPreferencesUpdate(BaseModel):
    preferred_genres: Optional[List[str]] = []
    favorite_directors: Optional[List[str]] = []
    favorite_actors: Optional[List[str]] = []
    preferred_vibes: Optional[List[str]] = []

class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    preferred_genres: List[str] = []
    favorite_directors: List[str] = []
    favorite_actors: List[str] = []
    preferred_vibes: List[str] = []
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Movie Schemas ---
class MovieBase(BaseModel):
    title: str
    tagline: Optional[str] = None
    overview: str
    release_year: int
    runtime: int
    poster_path: str
    backdrop_path: Optional[str] = None
    trailer_url: Optional[str] = None
    imdb_rating: float = 7.0
    cineverse_score: float = 8.5
    genres: List[str] = []
    director: Optional[str] = None
    cast: List[str] = []
    keywords: List[str] = []
    vibe_tags: List[str] = []
    streaming_providers: List[str] = []
    language: str = "English"

class MovieResponse(MovieBase):
    id: int
    tmdb_id: Optional[int] = None
    match_score: Optional[float] = 92.5
    recommendation_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Rating & Review Schemas ---
class RatingCreate(BaseModel):
    movie_id: int
    score: float = Field(..., ge=1.0, le=5.0)

class RatingResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    score: float
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    movie_id: int
    review_text: str
    contains_spoilers: bool = False

class ReviewResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    review_text: str
    contains_spoilers: bool
    likes_count: int
    username: str
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Watchlist & Favorite Schemas ---
class WatchlistUpdate(BaseModel):
    movie_id: int
    status: str = "want_to_watch" # want_to_watch, watching, completed, dropped

class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    status: str
    movie: MovieResponse
    updated_at: datetime

    class Config:
        from_attributes = True

class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    movie_id: int
    movie: MovieResponse

    class Config:
        from_attributes = True

# --- Semantic Search & AI Chat Schemas ---
class SemanticSearchRequest(BaseModel):
    query: str
    vibe: Optional[str] = None
    min_rating: Optional[float] = 0.0
    genre: Optional[str] = None
    search_type: str = "semantic" # text, semantic, voice

class AIChatRequest(BaseModel):
    message: str

class AIChatMessageResponse(BaseModel):
    id: int
    role: str
    message: str
    suggested_movies: List[MovieResponse] = []
    created_at: datetime

# --- Taste Analytics Schemas ---
class TasteAnalyticsResponse(BaseModel):
    total_rated: int
    average_rating: float
    genre_distribution: dict
    vibe_distribution: dict
    favorite_directors: List[dict]
    watching_timeline: List[dict]
    movies_per_year: List[dict]
    top_vibe: Optional[str] = None
    favorite_era: Optional[str] = None
