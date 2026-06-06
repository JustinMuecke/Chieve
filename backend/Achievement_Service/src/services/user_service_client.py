import os
from datetime import datetime, timedelta, timezone

import httpx
import jwt

from src.models.errors import UserServiceError
from src.models.schemas import UserSummary


class UserServiceClient:
    def __init__(self):
        self._base_url = os.getenv("USER_SERVICE_URL", "http://user_service:8000")
        self._jwt_secret = os.getenv("JWT_SECRET", "supersecretkey")

    def _service_token(self) -> str:
        return jwt.encode(
            {
                "sub": "achievement_service",
                "type": "service",
                "service": "achievement_service",
                "exp": datetime.now(timezone.utc) + timedelta(seconds=60),
            },
            self._jwt_secret,
            algorithm="HS256",
        )

    async def get_following(self, user_id: int) -> list[UserSummary]:
        headers = {"Authorization": f"Bearer {self._service_token()}"}
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"{self._base_url}/internal/following/{user_id}",
                    headers=headers,
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise UserServiceError(f"User Service call failed: {e}") from e
        return [UserSummary(**item) for item in resp.json()]

    async def get_linked_platforms(self, user_id: int) -> list[dict]:
        """Returns [{"platform": str, "platform_user_id": str}] for the user."""
        headers = {"Authorization": f"Bearer {self._service_token()}"}
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"{self._base_url}/internal/linked-platforms/{user_id}",
                    headers=headers,
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise UserServiceError(f"User Service call failed: {e}") from e
        return resp.json()

    async def get_user_social_profile(self, user_id: int, viewer_id: int | None = None) -> dict:
        headers = {"Authorization": f"Bearer {self._service_token()}"}
        params = {}
        if viewer_id is not None:
            params["viewer_id"] = viewer_id
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"{self._base_url}/internal/users/{user_id}/social-profile",
                    headers=headers,
                    params=params,
                )
                if resp.status_code == 404:
                    return {}
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise UserServiceError(f"User Service call failed: {e}") from e
        return resp.json()

    async def get_users_by_ids(self, user_ids: list[int]) -> list[UserSummary]:
        if not user_ids:
            return []
        headers = {"Authorization": f"Bearer {self._service_token()}"}
        ids_param = ",".join(str(i) for i in user_ids)
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"{self._base_url}/internal/users",
                    headers=headers,
                    params={"ids": ids_param},
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise UserServiceError(f"User Service call failed: {e}") from e
        return [UserSummary(**item) for item in resp.json()]
