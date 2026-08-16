"""Guards against the A1 regression: recommendations always showing the same
movies regardless of vibe. Before the fix, every anonymous-user score tied
at the same 75% floor and the sort silently fell back to insertion order, so
switching vibes never changed the top results."""


def test_different_vibes_return_different_top_results(client):
    cyberpunk_res = client.get("/api/v1/recommendations/hybrid", params={"vibe": "Cyberpunk", "top_n": 3})
    feelgood_res = client.get("/api/v1/recommendations/hybrid", params={"vibe": "Feel-Good", "top_n": 3})
    assert cyberpunk_res.status_code == 200
    assert feelgood_res.status_code == 200

    cyberpunk_titles = [m["title"] for m in cyberpunk_res.json()]
    feelgood_titles = [m["title"] for m in feelgood_res.json()]

    assert cyberpunk_titles[0] != feelgood_titles[0]
    assert "Neon Circuit" in cyberpunk_titles[:2]  # the only Cyberpunk-tagged fixture movie


def test_vibe_filter_produces_differentiated_match_scores(client):
    # Before the A1 fix every movie tied at a shared 75-99 floor because the
    # per-movie clamp was applied before sorting; ranking on the raw score
    # first and normalizing the *sorted* results afterward means scores
    # within one result set should no longer all be identical.
    res = client.get("/api/v1/recommendations/hybrid", params={"top_n": 5})
    scores = [m["match_score"] for m in res.json()]
    assert len(set(scores)) > 1


def test_min_rating_filters_out_low_rated_movies(client):
    res = client.get("/api/v1/recommendations/hybrid", params={"min_rating": 8.0, "top_n": 10})
    for movie in res.json():
        assert movie["imdb_rating"] >= 8.0 or movie["cineverse_score"] >= 8.0
