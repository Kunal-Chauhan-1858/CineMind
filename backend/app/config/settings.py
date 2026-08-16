import os
from typing import List, Union

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    HAS_PYDANTIC_SETTINGS = True
except ImportError:
    HAS_PYDANTIC_SETTINGS = False
    try:
        from pydantic import BaseSettings
        SettingsConfigDict = None
    except ImportError:
        class BaseSettings:
            pass
        SettingsConfigDict = None

class Settings(BaseSettings):
    APP_NAME: str = "CineMind"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "cinemind-super-secret-jwt-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 4320
    
    DATABASE_URL: str = "sqlite:///./cinemind.db"
    
    TMDB_API_KEY: str = ""

    # How many TMDb discover pages (20 movies/page) to pull per language
    # bucket during catalog sync -- see catalog_sync.LANGUAGE_BUCKETS.
    # Override any of these in .env (e.g. CATALOG_PAGES_GLOBAL=12) to
    # reshape the language mix without touching code. Indian-language
    # buckets share one multiplier (CATALOG_PAGES_INDIAN_BASE) scaled per
    # industry below rather than five separate settings, since product
    # direction is "Indian cinema prioritized as a whole" rather than each
    # industry tuned independently.
    CATALOG_PAGES_INDIAN_BASE: int = 8   # Hindi gets this many pages
    CATALOG_PAGES_GLOBAL: int = 8        # Hollywood / English-language
    CATALOG_PAGES_KOREAN: int = 2
    CATALOG_PAGES_JAPANESE: int = 2
    CATALOG_PAGES_SPANISH: int = 2
    CATALOG_PAGES_FRENCH: int = 2
    GROQ_API_KEY: str = ""
    LLM_EMBEDDING_MODEL: str = "nomic-embed-text"
    EMBEDDING_BASE_URL: str = "http://localhost:11434/v1"
    EMBEDDING_API_KEY: str = "ollama"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000"
    ]

    if HAS_PYDANTIC_SETTINGS:
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore"
        )
    else:
        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            extra = "ignore"

settings = Settings()
