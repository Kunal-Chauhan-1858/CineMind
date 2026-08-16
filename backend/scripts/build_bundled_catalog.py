"""
build_bundled_catalog.py
=========================
One-time (well — run it whenever you want a bigger/fresher catalog) DEV
script that fetches real movies from TMDb across every LANGUAGE_BUCKET in
catalog_sync.py, and writes the result to app/data/bundled_catalog.json.

This is NOT run by the app at runtime. It's how "hundreds of movies with
full metadata, no live API key needed at runtime" actually gets built:
you run this once (or periodically) with a real TMDB_API_KEY, it writes a
plain JSON file, and that file ships with the app / gets committed to the
repo. Every future server startup just reads that JSON — no key, no
network call, no dependency on TMDb being reachable.

USAGE
-----
    cd backend
    export TMDB_API_KEY=your_real_key_here
    python -m scripts.build_bundled_catalog

    # Or fetch more/fewer pages per language without editing code:
    CATALOG_PAGES_INDIAN_BASE=15 CATALOG_PAGES_GLOBAL=15 \\
        python -m scripts.build_bundled_catalog

What it does, concretely:
  1. Walks LANGUAGE_BUCKETS (same rebalanced Indian/Hollywood/international
     mix the live "Load More" / admin sync-catalog features use).
  2. For each discover result, does a full per-movie detail lookup (not
     just the lightweight discover fields) so runtime, director, cast,
     and a real trailer key are populated too — the live sync endpoints
     intentionally skip this per-movie call for speed, but a one-time
     offline build can afford it.
  3. Merges the result with whatever's already in bundled_catalog.json
     (by tmdb_id — existing entries aren't clobbered, this only adds new
     ones), so you can re-run it later to keep growing the catalog.
  4. Writes the merged, deduped list back to bundled_catalog.json.

Safe to interrupt (Ctrl+C) — nothing is written until the very end, so a
partial run just means "try again" rather than a corrupted file.
"""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config.settings import settings  # noqa: E402
from app.services.tmdb import tmdb_service, normalize_discover_result  # noqa: E402
from app.services.catalog_sync import LANGUAGE_BUCKETS  # noqa: E402

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "bundled_catalog.json"


async def fetch_full_detail(tmdb_id: int, base_fields: dict) -> dict:
    """Upgrades a lightweight discover result with runtime/cast/director/trailer."""
    details = await tmdb_service.get_movie_details(tmdb_id)
    if not details:
        return base_fields

    if details.get("runtime"):
        base_fields["runtime"] = details["runtime"]
    if details.get("tagline"):
        base_fields["tagline"] = details["tagline"]

    credits = details.get("credits", {})
    if credits.get("cast"):
        base_fields["cast"] = [c["name"] for c in credits["cast"][:5]]
    if credits.get("crew"):
        directors = [c["name"] for c in credits["crew"] if c.get("job") == "Director"]
        if directors:
            base_fields["director"] = ", ".join(directors)

    for vid in details.get("videos", {}).get("results", []):
        if vid.get("site") == "YouTube" and vid.get("type") in ("Trailer", "Teaser"):
            base_fields["trailer_url"] = f"https://www.youtube.com/embed/{vid['key']}"
            break

    providers = details.get("watch/providers", {}).get("results", {}).get("US", {}).get("flatrate", [])
    if providers:
        base_fields["streaming_providers"] = [p["provider_name"] for p in providers[:3]]

    return base_fields


async def main():
    if not settings.TMDB_API_KEY:
        print("ERROR: TMDB_API_KEY is not set. Export it before running this script:")
        print("  export TMDB_API_KEY=your_real_key_here")
        sys.exit(1)

    existing = []
    if OUTPUT_PATH.exists():
        existing = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    existing_by_id = {m["tmdb_id"]: m for m in existing}
    print(f"Starting from {len(existing)} existing bundled movies.")

    genre_map = await tmdb_service.get_genre_map()
    id_to_name = {v: k for k, v in genre_map.items()}
    if not id_to_name:
        print("ERROR: could not load TMDb genre list — check your API key / network.")
        sys.exit(1)

    added = 0
    for label, lang, pages, min_votes in LANGUAGE_BUCKETS:
        print(f"\n[{label}] fetching {pages} page(s)...")
        for page in range(1, pages + 1):
            data = await tmdb_service.discover_movies(
                page=page, sort_by="popularity.desc", original_language=lang, min_vote_count=min_votes
            )
            if not data or not data.get("results"):
                continue

            for raw in data["results"]:
                normalized = normalize_discover_result(raw, id_to_name)
                if not normalized or normalized["tmdb_id"] in existing_by_id:
                    continue

                enriched = await fetch_full_detail(normalized["tmdb_id"], normalized)
                enriched.setdefault("keywords", [])
                enriched.setdefault("vibe_tags", [])
                enriched.setdefault("streaming_providers", [])
                enriched.setdefault("tagline", None)
                enriched.setdefault("director", None)
                enriched.setdefault("cast", [])

                existing_by_id[enriched["tmdb_id"]] = enriched
                added += 1
                print(f"  + {enriched['title']} ({enriched['release_year']})")

        print(f"[{label}] done — {added} new so far.")

    merged = list(existing_by_id.values())
    OUTPUT_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {len(merged)} total movies ({added} new) to {OUTPUT_PATH}")
    print("Commit this file — the app will load it at every future startup with no API key needed.")


if __name__ == "__main__":
    asyncio.run(main())
