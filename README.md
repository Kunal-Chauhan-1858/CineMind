# CineMind

Full-stack movie discovery app: a hybrid (content + rating + vibe) recommendation
engine over a TMDb-backed catalog, a conversational "Movie Assistant" that can
search by title/actor/director or by mood, a watchlist with real status
tracking, and a personal taste-analytics dashboard.

**Build status:** All items from the fix/polish brief (functional bugs, UX
fixes, and the security/accessibility/testing polish pass) are implemented
and verified — backend test suite passing, frontend production build
succeeding with no chunk-size warnings. See "What was tested" below for
exactly what was verified and how.

## Tech stack

- **Frontend:** React 18 + Vite + Tailwind CSS, Recharts for analytics
- **Backend:** Python + FastAPI
- **Database:** SQLite by default (zero-config), PostgreSQL supported via `DATABASE_URL`
- **Auth:** JWT access tokens (bcrypt password hashing), stored client-side, guest-session fallback for zero-friction browsing
- **Recommendations:** scikit-learn TF-IDF + cosine similarity (content signal) blended with rating, genre/vibe, and director signals
- **Catalog data:** TMDb API integration with a bundled offline fallback catalog

## Project structure

```
CineMind/
├── backend/
│   ├── app/
│   │   ├── api/                 # auth, movies, search, recommendations,
│   │   │                        # interactions (ratings/reviews/watchlist/
│   │   │                        # favorites), analytics, chatbot, admin
│   │   ├── auth/                # security.py (bcrypt+JWT), deps.py (guard +
│   │   │                        # guest-session resolution), rate_limit.py
│   │   ├── chatbot/              # assistant.py — the Movie Assistant
│   │   ├── config/               # settings.py (pydantic-settings)
│   │   ├── data/                 # bundled_catalog.json (offline fallback)
│   │   ├── database/             # SQLAlchemy engine/session
│   │   ├── models/                # ORM models
│   │   ├── recommender/          # engine.py — hybrid scorer
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   └── services/              # tmdb.py, catalog_sync.py, search_service.py
│   ├── tests/                    # pytest suite (see "What was tested")
│   ├── main.py                   # `uvicorn main:app` entrypoint (forwards to app.main)
│   ├── requirements.txt
│   ├── requirements-dev.txt      # adds pytest
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/client.js          # axios instance, attaches JWT from localStorage
    │   ├── context/                # AuthContext, MovieContext, ThemeContext, ChatContext
    │   ├── components/             # Navbar, HeroSpotlight, MovieCard/Grid/Row,
    │   │                           # MovieDetailsModal, TrailerModal, AuthModal,
    │   │                           # AIChatDrawer, TasteAnalyticsChart, VibeFilterBar
    │   ├── hooks/useFocusTrap.js   # shared modal focus-trap
    │   ├── pages/                  # Home, Discover, Dashboard, WatchlistPage,
    │   │                           # ProfilePage, AdminDashboard
    │   └── App.jsx                 # routes; Discover/Dashboard/AdminDashboard
    │                                # are code-split with React.lazy
    └── package.json
```

## Running locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- No database server required to start — SQLite is the zero-config default.
  Postgres is a drop-in swap via `DATABASE_URL` if you want it.

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit if you have a real TMDB_API_KEY
uvicorn main:app --reload --port 8000
```

On first run the app seeds itself: a small bundled catalog (~44 hand-tagged
movies with real vibe tags) loads immediately, and — if `TMDB_API_KEY` is
set — a background sync pulls in a much larger catalog across several
language buckets (Hollywood, Hindi, Korean, Japanese, Spanish, French).
Without a TMDb key the app still runs fully off the bundled catalog.

Confirm it's up: `curl http://127.0.0.1:8000/` (interactive docs at
`http://127.0.0.1:8000/docs`).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:5173
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000` (see
`vite.config.js`), so no `VITE_API_URL` is needed for local development.

### 3. Docker (optional)

```bash
docker-compose up --build
```

Runs backend on `:8000` and frontend on `:5173` as separate containers.

## Required environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `APP_NAME` / `ENVIRONMENT` / `DEBUG` | Basic app metadata |
| `SECRET_KEY` / `ALGORITHM` / `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT signing. Outside development the app refuses to start unless `SECRET_KEY` is a private 32+ character value |
| `ENVIRONMENT` | `development` (default) or `production`. Set `production` when deployed |
| `ADMIN_PASSWORD` | Password for `admin@cinemind.app`. No default; if unset, no admin account is created |
| `DATABASE_URL` | `sqlite:///./cinemind.db` by default; swap for a Postgres URL |
| `TMDB_API_KEY` | Enables live catalog sync; app runs on the bundled catalog without it |
| `CATALOG_PAGES_GLOBAL` / `CATALOG_PAGES_INDIAN_BASE` / `CATALOG_PAGES_KOREAN` / `CATALOG_PAGES_JAPANESE` / `CATALOG_PAGES_SPANISH` / `CATALOG_PAGES_FRENCH` | How many TMDb discover pages to pull per language bucket during catalog sync |
| `GROQ_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `LLM_EMBEDDING_MODEL` / `EMBEDDING_BASE_URL` / `EMBEDDING_API_KEY` | Reserved for optional LLM-backed features; the shipped Movie Assistant runs on rule-based keyword/entity detection and does not require any of these to function |
| `BACKEND_CORS_ORIGINS` | Explicit allow-list (never a wildcard) — lock this to your real deployed origins before shipping past localhost |

### Frontend

| Variable | Purpose |
|---|---|

## How recommendations work

`backend/app/recommender/engine.py` blends four signals into one score per
movie:

- **Content similarity** — TF-IDF over a weighted document (title, overview,
  genres, director, cast, keywords, vibe tags) with cosine similarity against
  the user's rated/favorited movies. The TF-IDF matrix is cached and only
  re-fit when the underlying movie set actually changes, since re-fitting on
  every request (including every Movie Assistant follow-up) was previously a
  real source of latency.
- **Rating signal** — the catalog's own IMDb/curated score.
- **Vibe and genre match** — hard filters when a vibe pill or a
  vibe/genre/industry phrase is explicitly requested, otherwise a soft boost.
- **Director affinity** — a small boost for directors the user has rated highly before.

Scores are ranked on their *raw* value first, then min-max normalized into a
display band across the *already-sorted* result set — this is what makes
switching vibes visibly reorder the row instead of every result tying at the
same percentage.

## How the Movie Assistant works

`backend/app/chatbot/assistant.py` is intentionally not an LLM call: it does
direct title/actor/director matching first (reusing the same logic as the
`/search` endpoint), then falls back to independent vibe, genre, and
industry (Bollywood / South Indian) keyword detection — all three can be
true at once, so "Bollywood comedy" or "top rated South Indian action" are
each applied as their own hard filter rather than one clobbering the other.
When it finds a direct title match, it replies with that movie plus a few
genuinely similar picks run back through the hybrid scorer, not a generic
top-5 list.

## What was tested

- **Backend:** `backend/tests/` (pytest) covers signup/login including
  duplicate-email and duplicate-username rejection and auth rate-limiting,
  a regression guard confirming different vibe filters actually return
  different top results and differentiated match scores, watchlist
  add/remove/status-change, idempotent rating creation/update, and the Movie
  Assistant's combined industry+genre filtering (e.g. "Bollywood comedy").
  All 18 tests pass against an isolated, per-test SQLite database seeded
  with a small purpose-built fixture catalog — not the bundled production
  catalog — so results are deterministic.
- **Frontend:** `npm run build` succeeds with no errors. The three biggest
  routes (Discover, Dashboard, AdminDashboard) are code-split via
  `React.lazy`, which resolved the earlier single-bundle chunk-size warning
  (now a 308KB main chunk instead of one ~800KB chunk).
- **Not exercised in an automated way:** live browser/visual QA (modal
  focus-trapping, mobile breakpoints, color contrast) and behavior against a
  real `TMDB_API_KEY` / live catalog sync — both are implemented per the
  fix brief but should be spot-checked by hand before shipping.

Run the backend suite yourself:

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

A GitHub Actions workflow (`.github/workflows/backend-tests.yml`) runs the
same command on every push/PR touching `backend/`.

## Known stubs / TODOs

- The `GROQ_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / embedding
  settings in `config/settings.py` are reserved for a future LLM-backed
  upgrade to the Movie Assistant — nothing currently reads them, since the
  shipped assistant is fully rule-based and works without any of these keys.
- Catalog sync (`services/catalog_sync.py`) needs a real `TMDB_API_KEY` to
  do anything beyond the bundled ~44-movie catalog; without one, vibe/genre
  variety is limited to what's hand-tagged in `app/data/bundled_catalog.json`.
- `frontend/src/pages/AdminDashboard.jsx` is reachable at the `/admin` route
  with no route-level role check in the frontend router — access control
  currently relies entirely on the backend rejecting non-admin tokens on
  admin endpoints (`app/api/admin.py` does check `current_user.is_admin`); a
  frontend redirect-if-not-admin guard would be a reasonable follow-up.
- Rate limiting (`auth/rate_limit.py`) is an in-memory per-process limiter —
  fine for a single instance, but won't be shared across replicas if this is
  ever deployed with multiple backend workers; swap for a Redis-backed
  limiter at that point.
