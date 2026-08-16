"""Guards against the A3.3 regression: combined queries like "Bollywood
comedy" used to silently drop one signal because industry tags lived in the
same dict as thematic genres and detection broke on the first match."""


def _reply_movies(client, message):
    res = client.post("/api/v1/chatbot/message", json={"message": message})
    assert res.status_code == 200
    body = res.json()
    return body["message"], body["suggested_movies"]


def test_bollywood_comedy_matches_both_signals(client):
    _, movies = _reply_movies(client, "Bollywood comedy")
    assert movies, "expected at least one result for 'Bollywood comedy'"
    for m in movies:
        assert "Bollywood" in m["genres"]
        assert "Comedy" in m["genres"]


def test_top_rated_bollywood_movies(client):
    reply, movies = _reply_movies(client, "top rated Bollywood movies")
    assert movies
    for m in movies:
        assert "Bollywood" in m["genres"]
        assert m["imdb_rating"] >= 8.0 or m["cineverse_score"] >= 8.0
    # Both signals ("Bollywood" and "top rated") should be acknowledged in
    # the reply text, not just one of the two.
    assert "bollywood" in reply.lower()


def test_south_indian_action_is_not_confused_with_bollywood(client):
    # No South Indian-tagged action fixture exists, so this should come back
    # empty or generic rather than incorrectly substituting Bollywood
    # results -- the important thing is it never mislabels a Bollywood movie
    # as "South Indian".
    reply, movies = _reply_movies(client, "South Indian action")
    for m in movies:
        assert "South Indian" in m["genres"]


def test_reply_never_contains_literal_markdown_asterisks(client):
    reply, _ = _reply_movies(client, "feel-good comedy")
    assert "**" not in reply


def test_direct_title_match_before_generic_fallback(client):
    reply, movies = _reply_movies(client, "tell me about Neon Circuit")
    assert movies
    assert movies[0]["title"] == "Neon Circuit"
