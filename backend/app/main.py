import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config.settings import settings
from app.database.session import Base, engine, SessionLocal
from app.services.seed_data import init_db_data
from app.services.catalog_sync import sync_global_catalog, heal_broken_posters, backfill_vibe_tags
from app.api import auth, movies, recommendations, interactions, analytics, chatbot, search, admin

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cinemind")

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Seed initial dataset — this is plain sync work (no network calls), so it's
# safe to run here at import time, before the ASGI event loop exists.
try:
    with SessionLocal() as db:
        init_db_data(db)
        logger.info("Database initialized & seeded successfully.")
except Exception as e:
    logger.error(f"Error seeding database: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Network-bound startup work (TMDb calls) has to run *inside* the ASGI
    # event loop that uvicorn manages, via FastAPI's lifespan — not via a
    # bare `asyncio.run()` at module import time, which raises
    # "asyncio.run() cannot be called from a running event loop" as soon as
    # uvicorn (especially with --reload) has already started its own loop
    # before importing this module.
    try:
        with SessionLocal() as db:
            poster_result = await heal_broken_posters(db)
            if poster_result["healed"] or poster_result["fell_back"]:
                logger.info(
                    f"Poster check: {poster_result['healed']} repaired with real TMDb art, "
                    f"{poster_result['fell_back']} given the fallback image (no TMDB_API_KEY configured)."
                )

            imported = await sync_global_catalog(db)
            if imported:
                logger.info(f"Catalog sync imported {imported} movies from TMDb.")

            backfill_vibe_tags(db)
    except Exception as e:
        logger.error(f"Error during TMDb startup sync: {e}")

    yield  # app runs here

    # (no shutdown work needed)

app = FastAPI(
    title=settings.APP_NAME,
    description="A simple, smart movie recommendation engine.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(movies.router, prefix=settings.API_V1_STR)
app.include_router(recommendations.router, prefix=settings.API_V1_STR)
app.include_router(interactions.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(chatbot.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "docs": "/docs",
        "recommendation_engine": "Hybrid (Content-Based + Collaborative + Mood Vibe Scorer)"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )
