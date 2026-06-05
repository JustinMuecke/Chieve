import os
import re
import secrets
from urllib.parse import urlencode

from fastapi import Request
from fastapi.responses import RedirectResponse
import httpx

from src.models.errors import SteamAuthError, SteamStateError
from src.services.postgres_service import PostgresService

STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"
STEAM_ID_PATTERN = re.compile(r"https://steamcommunity\.com/openid/id/(\d+)$")


class SteamService:
    def __init__(self, postgres: PostgresService):
        self.postgres = postgres
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

        redirect = RedirectResponse(url=f"{self.frontend_url}/settings")
        redirect.delete_cookie("steam_state")
        return redirect
