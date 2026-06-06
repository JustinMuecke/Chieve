import os
from datetime import datetime, timedelta, timezone

import httpx
import jwt

from src.models.errors import AchievementServiceError


class AchievementServiceClient:
    def __init__(self):
        self._base_url = os.getenv("ACHIEVEMENT_SERVICE_URL", "http://achievement_service:8001")
        self._jwt_secret = os.getenv("JWT_SECRET", "supersecretkey")

    def _service_token(self) -> str:
        return jwt.encode(
            {
                "sub": "user_service",
                "type": "service",
                "service": "user_service",
                "exp": datetime.now(timezone.utc) + timedelta(seconds=60),
            },
            self._jwt_secret,
            algorithm="HS256",
        )

    async def get_achievement_breakdown(self, user_id: int) -> dict:
        headers = {"Authorization": f"Bearer {self._service_token()}"}
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"{self._base_url}/internal/users/{user_id}/achievement-breakdown",
                    headers=headers,
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise AchievementServiceError(f"Achievement Service call failed: {e}") from e
        return resp.json()
