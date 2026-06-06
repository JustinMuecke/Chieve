import os

import redis

from src.models.errors import SyncRateLimitedError

RATE_LIMIT_SECONDS = 15 * 60  # 15 minutes
_RATE_KEY = "sync:ratelimit:{user_id}"


class SyncService:
    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._redis = redis.from_url(redis_url, decode_responses=True)

    def check_and_set_rate_limit(self, user_id: int) -> None:
        """Raises SyncRateLimitedError if user has synced within the last 15 minutes."""
        key = _RATE_KEY.format(user_id=user_id)
        if self._redis.get(key):
            ttl = self._redis.ttl(key)
            raise SyncRateLimitedError(f"Sync rate limited. Try again in {ttl} seconds.")
        self._redis.setex(key, RATE_LIMIT_SECONDS, "1")

    def get_rate_limit_ttl(self, user_id: int) -> int | None:
        """Returns seconds until rate limit expires, or None if not rate limited."""
        key = _RATE_KEY.format(user_id=user_id)
        ttl = self._redis.ttl(key)
        return ttl if ttl > 0 else None
