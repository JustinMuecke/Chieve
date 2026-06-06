from datetime import datetime, timezone

from src.services.postgres_service import PostgresService


MILESTONE_FIRST_UNLOCK = "first_unlock"
MILESTONE_GAME_COMPLETE = "game_complete"
MILESTONE_SUB1PCT = "sub1pct_unlock"


class MilestoneService:
    def __init__(self, postgres: PostgresService):
        self._pg = postgres

    async def detect_and_save(
        self,
        user_id: int,
        game_id: int,
        newly_unlocked_api_names: list[str],
        all_achievements_for_game: list,
    ) -> None:
        if not newly_unlocked_api_names:
            return

        now = datetime.now(timezone.utc)

        # first_unlock: first achievement ever on the platform
        if not await self._pg.milestone_exists(user_id, MILESTONE_FIRST_UNLOCK):
            if not await self._pg.has_any_achievement(user_id):
                await self._pg.add_milestone(
                    user_id, MILESTONE_FIRST_UNLOCK, now, game_id=game_id
                )

        # game_complete: all achievements in this game unlocked
        if not await self._pg.milestone_exists(user_id, MILESTONE_GAME_COMPLETE, game_id=game_id):
            unlocked, total = await self._pg.get_user_achievement_count(user_id, game_id)
            if total > 0 and unlocked >= total:
                await self._pg.add_milestone(
                    user_id, MILESTONE_GAME_COMPLETE, now, game_id=game_id
                )

        # sub1pct_unlock: any newly unlocked achievement with <1% global rarity
        ach_map = {a.api_name: a for a in all_achievements_for_game}
        for api_name in newly_unlocked_api_names:
            ach = ach_map.get(api_name)
            if (
                ach
                and ach.global_unlock_percent is not None
                and float(ach.global_unlock_percent) < 1.0
            ):
                await self._pg.add_milestone(
                    user_id,
                    MILESTONE_SUB1PCT,
                    now,
                    game_id=game_id,
                    achievement_id=ach.id,
                )
