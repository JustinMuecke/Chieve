from src.models.errors import AchievementServiceError
from src.models.schemas import WishlistItem


class WishlistService:
    async def get_wishlist(self, user_id: int, postgres, achievement_client) -> list[WishlistItem]:
        entries = await postgres.get_wishlist_entries(user_id)
        if not entries:
            return []

        app_ids = [app_id for app_id, _ in entries]
        added_at_map = {app_id: added_at for app_id, added_at in entries}

        try:
            game_details = await achievement_client.get_games_by_app_ids(app_ids)
        except AchievementServiceError:
            return []

        return [
            WishlistItem(
                app_id=g["app_id"],
                name=g["name"],
                header_image_url=g.get("header_image_url"),
                description=g.get("description"),
                tags=g.get("tags"),
                achievement_count=g.get("achievement_count", 0),
                added_at=added_at_map[g["app_id"]],
            )
            for g in game_details
        ]
