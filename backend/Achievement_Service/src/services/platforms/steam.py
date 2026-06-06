from datetime import datetime, timedelta, timezone

from src.models.errors import SteamPrivateProfileError, SteamAPIError
from src.services.platforms.base import BasePlatformService
from src.services.steam_api_service import SteamApiService

_STATS_TTL = timedelta(days=7)


class SteamPlatformService(BasePlatformService):
    platform_name = "steam"

    def __init__(self):
        self._api = SteamApiService()

    async def sync_user(self, user_id, platform_user_id, postgres, milestone_svc, progress_callback):
        steam_id = platform_user_id
        try:
            owned_games = await self._api.get_owned_games(steam_id)
        except SteamPrivateProfileError:
            return {"status": "private_profile", "games_processed": 0}
        except SteamAPIError:
            return {"status": "steam_unavailable", "games_processed": 0}

        total = len(owned_games)
        for idx, game_data in enumerate(owned_games):
            app_id = game_data["appid"]
            game_name = game_data.get("name", f"App {app_id}")
            header_image = (
                f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"
            )

            game = await postgres.upsert_game(
                external_app_id=app_id,
                name=game_name,
                header_image_url=header_image,
            )

            try:
                player_achievements = await self._api.get_player_achievements(steam_id, app_id)
            except (SteamPrivateProfileError, SteamAPIError):
                continue

            if not player_achievements:
                continue

            existing = await postgres.get_achievements_by_game(game.id)
            stats_age = (
                datetime.now(timezone.utc) - game.global_stats_updated_at
                if game.global_stats_updated_at is not None
                else None
            )
            if not existing or stats_age is None or stats_age > _STATS_TTL:
                schema = await self._api.get_schema_for_game(app_id)
                percentages = await self._api.get_global_achievement_percentages(app_id)
                rows = self._api.build_achievement_rows(schema, percentages)
                await postgres.upsert_achievements(game.id, rows)
                await postgres.update_game_stats_timestamp(game.id)

            unlocks = [
                {
                    "api_name": pa["apiname"],
                    "game_id": game.id,
                    "unlocked_at": self._api.parse_unlock_time(pa.get("unlocktime", 0)),
                }
                for pa in player_achievements
                if pa.get("achieved")
            ]

            newly_unlocked = await postgres.upsert_user_achievements(user_id, unlocks)

            all_achievements = await postgres.get_achievements_by_game(game.id)
            await milestone_svc.detect_and_save(
                user_id=user_id,
                game_id=game.id,
                newly_unlocked_api_names=newly_unlocked,
                all_achievements_for_game=all_achievements,
            )

            progress_callback(round((idx + 1) / total * 100))

        return {"status": "complete", "games_processed": total}
