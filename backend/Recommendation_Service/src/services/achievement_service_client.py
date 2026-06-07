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
                "sub": "recommendation_service",
                "type": "service",
                "service": "recommendation_service",
                "exp": datetime.now(timezone.utc) + timedelta(seconds=60),
            },
            self._jwt_secret,
            algorithm="HS256",
        )

    async def get_owned_app_ids(self, user_id: int) -> list[int]:
        headers = {"Authorization": f"Bearer {self._service_token()}"}
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"{self._base_url}/internal/owned-app-ids/{user_id}",
                    headers=headers,
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise AchievementServiceError(f"Achievement Service call failed: {e}") from e
        return resp.json()

    async def get_games_by_app_ids(self, app_ids: list[int]) -> list[dict]:
        if not app_ids:
            return []
        headers = {"Authorization": f"Bearer {self._service_token()}"}
        ids_param = ",".join(str(i) for i in app_ids)
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"{self._base_url}/internal/games",
                    headers=headers,
                    params={"app_ids": ids_param},
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise AchievementServiceError(f"Achievement Service call failed: {e}") from e
        return resp.json()

    async def get_all_games(self, limit: int = 100, offset: int = 0) -> list[dict]:
        headers = {"Authorization": f"Bearer {self._service_token()}"}
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.get(
                    f"{self._base_url}/internal/games",
                    headers=headers,
                    params={"limit": limit, "offset": offset},
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise AchievementServiceError(f"Achievement Service call failed: {e}") from e
        return resp.json()

    async def get_user_game_completion(self, user_id: int) -> list[dict]:
        """Returns [{app_id, completion_pct}] for the user's played games."""
        headers = {"Authorization": f"Bearer {self._service_token()}"}
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"{self._base_url}/internal/user-game-completion/{user_id}",
                    headers=headers,
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise AchievementServiceError(f"Achievement Service call failed: {e}") from e
        return resp.json()
