import os
import re
import secrets
from urllib.parse import urlencode

from fastapi import Request
from fastapi.responses import RedirectResponse
import httpx

from src.models.errors import SteamAuthError, SteamStateError
from src.services.postgres_service import PostgresService
from src.services.s3_service import S3Service

STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"
STEAM_PLAYER_API = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
STEAM_ID_PATTERN = re.compile(r"https://steamcommunity\.com/openid/id/(\d+)$")


class SteamService:
    def __init__(self, postgres: PostgresService, s3: S3Service):
        self.postgres = postgres
        self.s3 = s3
        self.steam_api_key = os.getenv("STEAM_API_KEY")
        self.callback_url = os.getenv("STEAM_CALLBACK_URL", "http://localhost:8000/api/user/steam/callback")
        self.realm = os.getenv("STEAM_REALM", "http://localhost:8000")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        self._secure_cookies = os.getenv("ENV") == "production"

    def link(self):
        state = secrets.token_urlsafe(32)
        params = urlencode({
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "checkid_setup",
            "openid.return_to": f"{self.callback_url}?state={state}",
            "openid.realm": self.realm,
            "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
            "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
        })
        response = RedirectResponse(url=f"{STEAM_OPENID_URL}?{params}")
        response.set_cookie(
            key="steam_state",
            value=state,
            httponly=True,
            max_age=300,
            samesite="lax",
            secure=self._secure_cookies,
        )
        return response

    async def callback(self, request: Request, user_id: int):
        state = request.query_params.get("state")
        cookie_state = request.cookies.get("steam_state")
        if not cookie_state or cookie_state != state:
            raise SteamStateError("State verification failed (possible CSRF request)")

        validation_params = {
            k: v for k, v in request.query_params.items() if k != "state"
        }
        validation_params["openid.mode"] = "check_authentication"

        async with httpx.AsyncClient() as client:
            try:
                validation_response = await client.post(STEAM_OPENID_URL, data=validation_params)
                validation_response.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise SteamAuthError(f"Steam validation request failed: {e.response.status_code}") from e

        if "is_valid:true" not in validation_response.text:
            raise SteamAuthError("Steam OpenID assertion is not valid")

        claimed_id = request.query_params.get("openid.claimed_id", "")
        match = STEAM_ID_PATTERN.match(claimed_id)
        if not match:
            raise SteamAuthError("Could not extract SteamID from claimed identity")

        steam_id = match.group(1)

        await self.postgres.link_platform(
            user_id=user_id,
            platform="steam",
            platform_user_id=steam_id,
        )

        await self._copy_steam_avatar(user_id, steam_id)

        redirect = RedirectResponse(url=f"{self.frontend_url}/settings")
        redirect.delete_cookie("steam_state")
        return redirect

    async def _copy_steam_avatar(self, user_id: int, steam_id: str) -> None:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    STEAM_PLAYER_API,
                    params={"key": self.steam_api_key, "steamids": steam_id},
                )
                resp.raise_for_status()
                players = resp.json().get("response", {}).get("players", [])
                if not players:
                    return
                cdn_url = players[0].get("avatarfull")
                if not cdn_url:
                    return

            # Try to cache in S3; fall back to Steam CDN URL
            final_url = cdn_url
            try:
                key = self.s3.avatar_key(user_id, "steam")
                final_url = await self.s3.copy_from_url(cdn_url, key)
            except Exception:
                pass

            await self.postgres.update_linked_account_avatar(user_id, "steam", final_url)
            await self.postgres.update_user_avatar(user_id, final_url)
        except Exception:
            pass  # avatar fetch is best-effort, never fail the link
