import os
import re
from datetime import datetime, timezone

import httpx

from src.models.errors import SteamAPIError, SteamPrivateProfileError


def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


STEAM_API_BASE = "https://api.steampowered.com"
STEAM_STORE_API_BASE = "https://store.steampowered.com/api"


def _global_points(unlock_percent: float | str | None) -> int:
    if unlock_percent is None:
        return 10
    return max(10, round(100 - float(unlock_percent)))


class SteamApiService:
    def __init__(self):
        self._api_key = os.getenv("STEAM_API_KEY", "")

    async def get_owned_games(self, steam_id: str) -> list[dict]:
        """Returns list of {appid, name, img_icon_url}."""
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"{STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/",
                    params={
                        "key": self._api_key,
                        "steamid": steam_id,
                        "include_appinfo": 1,
                        "include_played_free_games": 1,
                    },
                )
                resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise SteamAPIError(f"Steam API error {e.response.status_code}") from e
        except httpx.TransportError as e:
            raise SteamAPIError(f"Steam API unreachable: {e}") from e
        data = resp.json().get("response", {})
        if "games" not in data:
            raise SteamPrivateProfileError("Steam profile is private or has no games")
        return data["games"]

    async def get_player_achievements(self, steam_id: str, app_id: int) -> list[dict]:
        """Returns list of {apiname, achieved, unlocktime}."""
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"{STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/",
                    params={"key": self._api_key, "steamid": steam_id, "appid": app_id},
                )
        except httpx.TransportError as e:
            raise SteamAPIError(f"Steam API unreachable for app {app_id}: {e}") from e
        if resp.status_code == 403:
            raise SteamPrivateProfileError(f"Achievements for app {app_id} are private")
        if resp.status_code != 200:
            raise SteamAPIError(f"Steam API error {resp.status_code} for app {app_id}")
        data = resp.json().get("playerstats", {})
        if not data.get("success"):
            return []
        return data.get("achievements", [])

    async def get_schema_for_game(self, app_id: int) -> list[dict]:
        """Returns list of achievement schema dicts for the game."""
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"{STEAM_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/",
                    params={"key": self._api_key, "appid": app_id},
                )
        except httpx.TransportError:
            return []
        if resp.status_code != 200:
            return []
        data = resp.json().get("game", {}).get("availableGameStats", {})
        return data.get("achievements", [])

    async def get_global_achievement_percentages(self, app_id: int) -> dict[str, float]:
        """Returns {api_name: unlock_percent}."""
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"{STEAM_API_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
                    params={"gameid": app_id},
                )
        except httpx.TransportError:
            return {}
        if resp.status_code != 200:
            return {}
        achievements = resp.json().get("achievementpercentages", {}).get("achievements", [])
        return {a["name"]: a["percent"] for a in achievements}

    def build_achievement_rows(
        self, schema: list[dict], percentages: dict[str, float]
    ) -> list[dict]:
        """Merges schema + percentages into rows ready for upsert_achievements."""
        rows = []
        for ach in schema:
            api_name = ach.get("name", "")
            pct = percentages.get(api_name)
            rows.append({
                "api_name": api_name,
                "display_name": ach.get("displayName"),
                "description": ach.get("description"),
                "icon_url": ach.get("icon"),
                "global_unlock_percent": float(pct) if pct is not None else None,
                "global_points": _global_points(pct),
            })
        return rows

    async def get_store_details(self, app_id: int) -> dict | None:
        """Returns {description, tags} from Steam Store API, or None on failure."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{STEAM_STORE_API_BASE}/appdetails",
                    params={"appids": app_id},
                )
                resp.raise_for_status()
        except httpx.HTTPError:
            return None
        data = resp.json().get(str(app_id), {})
        if not data.get("success"):
            return None
        app_data = data.get("data", {})
        if not isinstance(app_data, dict):
            return None
        description = (
            app_data.get("short_description")
            or _strip_html(app_data.get("detailed_description") or "")[:600]
            or None
        )
        genres = app_data.get("genres", [])
        tags = [g["description"] for g in genres if g.get("description")] or None
        return {"description": description, "tags": tags}

    def parse_unlock_time(self, unlocktime: int) -> datetime | None:
        if not unlocktime:
            return None
        return datetime.fromtimestamp(unlocktime, tz=timezone.utc)
