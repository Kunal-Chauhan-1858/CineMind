"""
Minimal in-memory rate limiter for /auth/login and /auth/signup.

This is intentionally simple (a per-process dict of timestamps keyed by
client IP) rather than pulling in Redis or slowapi -- good enough to blunt
naive brute-force attempts on a single-instance deployment. If CineMind is
ever run behind multiple worker processes or replicas, this should be
swapped for a shared store (Redis) since counts won't be synchronized
across processes.
"""
import time
from collections import defaultdict
from fastapi import HTTPException, Request, status

# window_seconds -> max_requests
WINDOW_SECONDS = 60
MAX_ATTEMPTS_PER_WINDOW = 10

_attempts: dict[str, list[float]] = defaultdict(list)


def rate_limit_auth(request: Request, bucket: str) -> None:
    """Raise 429 if this client has exceeded the allowed attempts for the
    given bucket (e.g. "login" or "signup") within the current window."""
    client_ip = request.client.host if request.client else "unknown"
    key = f"{bucket}:{client_ip}"
    now = time.time()

    attempts = _attempts[key]
    # Drop anything outside the current window
    attempts[:] = [t for t in attempts if now - t < WINDOW_SECONDS]

    if len(attempts) >= MAX_ATTEMPTS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait a minute and try again.",
        )

    attempts.append(now)
