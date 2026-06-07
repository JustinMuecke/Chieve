from datetime import datetime, timezone

from sqlalchemy import func, select, text
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.models.achievement import (
    Achievement,
    Game,
    Guide,
    GuideFavorite,
    UserAchievement,
    UserMilestone,
    UserProfileStats,
)
from src.models.errors import (
    GuideFavoriteAlreadyExistsError,
    GuideFavoriteNotFoundError,
    GuideForbiddenError,
    GuideNotFoundError,
)


class PostgresService:
    def __init__(self, host: str, username: str, password: str, database: str):
        url = f"postgresql+asyncpg://{username}:{password}@{host}/{database}"
        engine = create_async_engine(url)
        self._session = async_sessionmaker(engine, expire_on_commit=False)

    # ── Games ──────────────────────────────────────────────────────────────────

    async def upsert_game(self, external_app_id: int, name: str, header_image_url: str | None) -> Game:
        async with self._session() as session:
            stmt = (
                insert(Game)
                .values(external_app_id=external_app_id, name=name, header_image_url=header_image_url)
                .on_conflict_do_update(
                    index_elements=["external_app_id"],
                    set_={"name": name, "header_image_url": header_image_url},
                )
                .returning(Game)
            )
            result = await session.execute(stmt)
            await session.commit()
            return result.scalar_one()

    async def update_game_store_details(
        self, external_app_id: int, description: str | None, tags: list[str] | None
    ) -> None:
        """Updates description and tags on a game row, only overwriting non-null values."""
        if description is None and tags is None:
            return
        async with self._session() as session:
            result = await session.execute(
                select(Game).where(Game.external_app_id == external_app_id)
            )
            game = result.scalar_one_or_none()
            if not game:
                return
            if description is not None:
                game.description = description
            if tags is not None:
                game.tags = tags
            await session.commit()

    async def get_all_game_app_ids(self) -> list[int]:
        """Returns external_app_ids of all games."""
        async with self._session() as session:
            result = await session.execute(select(Game.external_app_id))
            return [row[0] for row in result]

    async def get_user_stats_timeline(self, user_id: int) -> list[dict]:
        """Returns daily achievement/points data for the last 12 months with cumulative points."""
        async with self._session() as session:
            result = await session.execute(
                text("""
                    WITH daily AS (
                        SELECT
                            DATE(ua.unlocked_at AT TIME ZONE 'UTC') AS date,
                            COUNT(*)::int                            AS daily_achievements,
                            COALESCE(SUM(a.global_points), 0)::int  AS daily_points
                        FROM user_achievements ua
                        JOIN achievements a ON a.id = ua.achievement_id
                        WHERE ua.user_id = :user_id
                          AND ua.unlocked_at >= NOW() - INTERVAL '12 months'
                          AND ua.unlocked_at IS NOT NULL
                        GROUP BY DATE(ua.unlocked_at AT TIME ZONE 'UTC')
                    )
                    SELECT
                        date,
                        daily_achievements,
                        daily_points,
                        SUM(daily_points) OVER (ORDER BY date)::int AS cumulative_points
                    FROM daily
                    ORDER BY date
                """),
                {"user_id": user_id},
            )
            return [
                {
                    "date": row.date,
                    "daily_achievements": row.daily_achievements,
                    "daily_points": row.daily_points,
                    "cumulative_points": row.cumulative_points,
                }
                for row in result
            ]

    async def get_games_missing_descriptions(self) -> list[int]:
        """Returns external_app_ids of all games with no description yet."""
        async with self._session() as session:
            result = await session.execute(
                select(Game.external_app_id).where(Game.description.is_(None))
            )
            return [row[0] for row in result]

    async def update_game_stats_timestamp(self, game_id: int) -> None:
        async with self._session() as session:
            result = await session.execute(select(Game).where(Game.id == game_id))
            game = result.scalar_one_or_none()
            if game:
                game.global_stats_updated_at = datetime.now(timezone.utc)
                await session.commit()

    async def get_game_by_app_id(self, external_app_id: int) -> Game | None:
        async with self._session() as session:
            result = await session.execute(
                select(Game).where(Game.external_app_id == external_app_id)
            )
            return result.scalar_one_or_none()

    async def get_all_games(
        self, q: str | None, page: int, page_size: int
    ) -> tuple[list[dict], int]:
        offset = (page - 1) * page_size
        async with self._session() as session:
            if q:
                count_result = await session.execute(
                    text("SELECT COUNT(*) FROM games WHERE name ILIKE :q"),
                    {"q": f"%{q}%"},
                )
                total = count_result.scalar_one()
                result = await session.execute(
                    text("""
                        SELECT g.external_app_id, g.name, g.header_image_url,
                               COUNT(a.id) AS total_achievements
                        FROM games g
                        LEFT JOIN achievements a ON a.game_id = g.id
                        WHERE g.name ILIKE :q
                        GROUP BY g.id
                        ORDER BY g.name
                        LIMIT :limit OFFSET :offset
                    """),
                    {"q": f"%{q}%", "limit": page_size, "offset": offset},
                )
            else:
                count_result = await session.execute(text("SELECT COUNT(*) FROM games"))
                total = count_result.scalar_one()
                result = await session.execute(
                    text("""
                        SELECT g.external_app_id, g.name, g.header_image_url,
                               COUNT(a.id) AS total_achievements
                        FROM games g
                        LEFT JOIN achievements a ON a.game_id = g.id
                        GROUP BY g.id
                        ORDER BY g.name
                        LIMIT :limit OFFSET :offset
                    """),
                    {"limit": page_size, "offset": offset},
                )
            return [dict(row._mapping) for row in result], total

    async def get_user_games(self, user_id: int) -> list[dict]:
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT
                        g.external_app_id,
                        g.name,
                        g.header_image_url,
                        COUNT(a.id) AS total_achievements,
                        COUNT(ua.achievement_id) AS unlocked_achievements
                    FROM games g
                    JOIN achievements a ON a.game_id = g.id
                    LEFT JOIN user_achievements ua
                        ON ua.achievement_id = a.id AND ua.user_id = :user_id
                    WHERE EXISTS (
                        SELECT 1 FROM user_achievements ua2
                        JOIN achievements a2 ON a2.id = ua2.achievement_id
                        WHERE ua2.user_id = :user_id AND a2.game_id = g.id
                    )
                    GROUP BY g.id
                    ORDER BY unlocked_achievements DESC
                """),
                {"user_id": user_id},
            )
            return [dict(row._mapping) for row in result]

    async def get_game_with_user_achievements(self, user_id: int | None, external_app_id: int) -> dict | None:
        async with self._session() as session:
            game_result = await session.execute(
                select(Game).where(Game.external_app_id == external_app_id)
            )
            game = game_result.scalar_one_or_none()
            if not game:
                return None

            if user_id is not None:
                result = await session.execute(
                    text("""
                        SELECT
                            a.id, a.api_name, a.display_name, a.description,
                            a.icon_url, a.global_unlock_percent, a.global_points,
                            ua.unlocked_at
                        FROM achievements a
                        LEFT JOIN user_achievements ua
                            ON ua.achievement_id = a.id AND ua.user_id = :user_id
                        WHERE a.game_id = :game_id
                        ORDER BY a.global_unlock_percent ASC NULLS LAST
                    """),
                    {"user_id": user_id, "game_id": game.id},
                )
            else:
                result = await session.execute(
                    text("""
                        SELECT
                            a.id, a.api_name, a.display_name, a.description,
                            a.icon_url, a.global_unlock_percent, a.global_points,
                            NULL AS unlocked_at
                        FROM achievements a
                        WHERE a.game_id = :game_id
                        ORDER BY a.global_unlock_percent ASC NULLS LAST
                    """),
                    {"game_id": game.id},
                )
            achievements = [dict(row._mapping) for row in result]
            return {"game": game, "achievements": achievements}

    # ── Achievements ──────────────────────────────────────────────────────────

    async def upsert_achievements(self, game_id: int, achievements: list[dict]) -> None:
        """Bulk upsert game achievement schema (api_name, display_name, description, icon_url, global_unlock_percent, global_points)."""
        if not achievements:
            return
        async with self._session() as session:
            for ach in achievements:
                stmt = (
                    insert(Achievement)
                    .values(game_id=game_id, **ach)
                    .on_conflict_do_update(
                        index_elements=["game_id", "api_name"],
                        set_={
                            "display_name": ach.get("display_name"),
                            "description": ach.get("description"),
                            "icon_url": ach.get("icon_url"),
                            "global_unlock_percent": ach.get("global_unlock_percent"),
                            "global_points": ach.get("global_points", 10),
                        },
                    )
                )
                await session.execute(stmt)
            await session.commit()

    async def get_achievements_by_game(self, game_id: int) -> list[Achievement]:
        async with self._session() as session:
            result = await session.execute(
                select(Achievement).where(Achievement.game_id == game_id)
            )
            return list(result.scalars().all())

    # ── User Achievements ─────────────────────────────────────────────────────

    async def upsert_user_achievements(
        self, user_id: int, unlocks: list[dict]
    ) -> list[str]:
        """
        Upsert user achievement unlocks.
        unlocks: [{"api_name": str, "game_id": int, "unlocked_at": datetime | None}]
        Returns list of newly unlocked api_names (for milestone detection).
        """
        if not unlocks:
            return []
        async with self._session() as session:
            newly_unlocked = []
            for unlock in unlocks:
                ach_result = await session.execute(
                    select(Achievement).where(
                        Achievement.game_id == unlock["game_id"],
                        Achievement.api_name == unlock["api_name"],
                    )
                )
                achievement = ach_result.scalar_one_or_none()
                if not achievement:
                    continue

                existing = await session.execute(
                    select(UserAchievement).where(
                        UserAchievement.user_id == user_id,
                        UserAchievement.achievement_id == achievement.id,
                    )
                )
                if existing.scalar_one_or_none() is None:
                    session.add(
                        UserAchievement(
                            user_id=user_id,
                            achievement_id=achievement.id,
                            unlocked_at=unlock.get("unlocked_at"),
                        )
                    )
                    newly_unlocked.append(unlock["api_name"])

            await session.commit()
            return newly_unlocked

    async def get_user_achievement_count(self, user_id: int, game_id: int) -> tuple[int, int]:
        """Returns (unlocked, total) for a user in a game."""
        async with self._session() as session:
            total_result = await session.execute(
                select(func.count()).where(Achievement.game_id == game_id)
            )
            total = total_result.scalar_one()
            unlocked_result = await session.execute(
                text("""
                    SELECT COUNT(*) FROM user_achievements ua
                    JOIN achievements a ON a.id = ua.achievement_id
                    WHERE ua.user_id = :user_id AND a.game_id = :game_id
                """),
                {"user_id": user_id, "game_id": game_id},
            )
            unlocked = unlocked_result.scalar_one()
            return unlocked, total

    # ── Profile Stats ─────────────────────────────────────────────────────────

    async def upsert_profile_stats(self, user_id: int) -> None:
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT
                        COUNT(ua.achievement_id) AS total_achievements,
                        COALESCE(SUM(a.global_points), 0) AS total_global_points
                    FROM user_achievements ua
                    JOIN achievements a ON a.id = ua.achievement_id
                    WHERE ua.user_id = :user_id
                """),
                {"user_id": user_id},
            )
            row = result.one()
            stmt = (
                insert(UserProfileStats)
                .values(
                    user_id=user_id,
                    total_achievements=row.total_achievements,
                    total_global_points=row.total_global_points,
                    total_community_points=0,
                    updated_at=datetime.now(timezone.utc),
                )
                .on_conflict_do_update(
                    index_elements=["user_id"],
                    set_={
                        "total_achievements": row.total_achievements,
                        "total_global_points": row.total_global_points,
                        "updated_at": datetime.now(timezone.utc),
                    },
                )
            )
            await session.execute(stmt)
            await session.commit()

    async def get_profile_stats(self, user_id: int) -> UserProfileStats | None:
        async with self._session() as session:
            result = await session.execute(
                select(UserProfileStats).where(UserProfileStats.user_id == user_id)
            )
            return result.scalar_one_or_none()

    # ── Leaderboard ───────────────────────────────────────────────────────────

    async def get_leaderboard_global(
        self, sort_by: str, page: int, page_size: int
    ) -> tuple[list[dict], int]:
        col = "total_global_points" if sort_by == "global_points" else "total_community_points"
        offset = (page - 1) * page_size
        async with self._session() as session:
            count_result = await session.execute(
                select(func.count()).select_from(UserProfileStats)
            )
            total = count_result.scalar_one()
            result = await session.execute(
                text(f"""
                    SELECT
                        user_id,
                        total_achievements,
                        total_global_points,
                        total_community_points,
                        RANK() OVER (ORDER BY {col} DESC) AS rank
                    FROM user_profile_stats
                    ORDER BY {col} DESC
                    LIMIT :limit OFFSET :offset
                """),
                {"limit": page_size, "offset": offset},
            )
            return [dict(row._mapping) for row in result], total

    async def get_leaderboard_friends(
        self, user_ids: list[int], sort_by: str, page: int, page_size: int
    ) -> tuple[list[dict], int]:
        if not user_ids:
            return [], 0
        col = "total_global_points" if sort_by == "global_points" else "total_community_points"
        offset = (page - 1) * page_size
        async with self._session() as session:
            count_result = await session.execute(
                select(func.count()).select_from(UserProfileStats).where(
                    UserProfileStats.user_id.in_(user_ids)
                )
            )
            total = count_result.scalar_one()
            result = await session.execute(
                text(f"""
                    SELECT
                        user_id,
                        total_achievements,
                        total_global_points,
                        total_community_points,
                        RANK() OVER (ORDER BY {col} DESC) AS rank
                    FROM user_profile_stats
                    WHERE user_id = ANY(:user_ids)
                    ORDER BY {col} DESC
                    LIMIT :limit OFFSET :offset
                """),
                {"user_ids": user_ids, "limit": page_size, "offset": offset},
            )
            return [dict(row._mapping) for row in result], total

    # ── Feed ──────────────────────────────────────────────────────────────────

    async def get_feed_entries(
        self, user_ids: list[int], since: datetime, limit_per_user: int | None,
        app_id: int | None = None,
    ) -> list[dict]:
        if not user_ids:
            return []
        game_filter = "AND g.external_app_id = :app_id" if app_id is not None else ""
        async with self._session() as session:
            if limit_per_user:
                result = await session.execute(
                    text(f"""
                        SELECT ua.user_id, g.external_app_id, g.name AS game_name,
                               g.header_image_url, a.api_name, a.display_name,
                               a.icon_url, a.global_points, ua.unlocked_at
                        FROM (
                            SELECT *, ROW_NUMBER() OVER (
                                PARTITION BY user_id ORDER BY unlocked_at DESC
                            ) AS rn
                            FROM user_achievements
                            WHERE user_id = ANY(:user_ids) AND unlocked_at >= :since
                        ) ua
                        JOIN achievements a ON a.id = ua.achievement_id
                        JOIN games g ON g.id = a.game_id
                        WHERE ua.rn <= :limit_per_user {game_filter}
                        ORDER BY ua.user_id, g.id, ua.unlocked_at DESC
                    """),
                    {"user_ids": user_ids, "since": since, "limit_per_user": limit_per_user,
                     **( {"app_id": app_id} if app_id is not None else {})},
                )
            else:
                result = await session.execute(
                    text(f"""
                        SELECT ua.user_id, g.external_app_id, g.name AS game_name,
                               g.header_image_url, a.api_name, a.display_name,
                               a.icon_url, a.global_points, ua.unlocked_at
                        FROM user_achievements ua
                        JOIN achievements a ON a.id = ua.achievement_id
                        JOIN games g ON g.id = a.game_id
                        WHERE ua.user_id = ANY(:user_ids) AND ua.unlocked_at >= :since {game_filter}
                        ORDER BY ua.user_id, g.id, ua.unlocked_at DESC
                    """),
                    {"user_ids": user_ids, "since": since,
                     **( {"app_id": app_id} if app_id is not None else {})},
                )
            return [dict(row._mapping) for row in result]

    async def get_guide_by_id(self, guide_id: int) -> Guide:
        async with self._session() as session:
            result = await session.execute(select(Guide).where(Guide.id == guide_id))
            guide = result.scalar_one_or_none()
            if not guide:
                raise GuideNotFoundError(f"Guide {guide_id} not found")
            return guide

    async def get_feed_guides(
        self, user_ids: list[int], since: datetime, app_id: int | None = None
    ) -> list[dict]:
        if not user_ids:
            return []
        game_filter = "AND g.external_app_id = :app_id" if app_id is not None else ""
        async with self._session() as session:
            result = await session.execute(
                text(f"""
                    SELECT gu.id, gu.user_id, gu.title, gu.description, gu.created_at,
                           g.external_app_id AS app_id, g.name AS game_name
                    FROM guides gu
                    JOIN games g ON g.id = gu.game_id
                    WHERE gu.user_id = ANY(:user_ids) AND gu.created_at >= :since
                    {game_filter}
                    ORDER BY gu.created_at DESC
                """),
                {"user_ids": user_ids, "since": since,
                 **( {"app_id": app_id} if app_id is not None else {})},
            )
            return [dict(row._mapping) for row in result]

    # ── Search ────────────────────────────────────────────────────────────────

    async def search_achievements(
        self, query: str, game_id: int | None, max_rarity: float | None, limit: int
    ) -> list[dict]:
        async with self._session() as session:
            filters = ["(a.display_name ILIKE :q OR a.description ILIKE :q)"]
            params: dict = {"q": f"%{query}%", "limit": limit}
            if game_id is not None:
                filters.append("g.external_app_id = :game_id")
                params["game_id"] = game_id
            if max_rarity is not None:
                filters.append("a.global_unlock_percent <= :max_rarity")
                params["max_rarity"] = max_rarity
            where = " AND ".join(filters)
            result = await session.execute(
                text(f"""
                    SELECT a.id AS achievement_id, a.api_name, a.display_name,
                           a.description, a.icon_url, a.global_unlock_percent,
                           a.global_points, g.external_app_id AS app_id, g.name AS game_name
                    FROM achievements a
                    JOIN games g ON g.id = a.game_id
                    WHERE {where}
                    ORDER BY a.global_unlock_percent ASC NULLS LAST
                    LIMIT :limit
                """),
                params,
            )
            return [dict(row._mapping) for row in result]

    # ── Milestones ────────────────────────────────────────────────────────────

    async def add_milestone(
        self,
        user_id: int,
        milestone_type: str,
        achieved_at: datetime,
        game_id: int | None = None,
        achievement_id: int | None = None,
    ) -> None:
        async with self._session() as session:
            session.add(
                UserMilestone(
                    user_id=user_id,
                    milestone_type=milestone_type,
                    game_id=game_id,
                    achievement_id=achievement_id,
                    achieved_at=achieved_at,
                )
            )
            await session.commit()

    async def milestone_exists(
        self, user_id: int, milestone_type: str, game_id: int | None = None
    ) -> bool:
        async with self._session() as session:
            stmt = select(UserMilestone).where(
                UserMilestone.user_id == user_id,
                UserMilestone.milestone_type == milestone_type,
            )
            if game_id is not None:
                stmt = stmt.where(UserMilestone.game_id == game_id)
            result = await session.execute(stmt)
            return result.scalar_one_or_none() is not None

    async def get_milestones(self, user_id: int) -> list[dict]:
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT um.id, um.milestone_type, um.game_id, um.achievement_id,
                           um.achieved_at, g.name AS game_name, a.display_name AS achievement_name
                    FROM user_milestones um
                    LEFT JOIN games g ON g.id = um.game_id
                    LEFT JOIN achievements a ON a.id = um.achievement_id
                    WHERE um.user_id = :user_id
                    ORDER BY um.achieved_at DESC
                """),
                {"user_id": user_id},
            )
            return [dict(row._mapping) for row in result]

    async def has_any_achievement(self, user_id: int) -> bool:
        async with self._session() as session:
            result = await session.execute(
                select(func.count()).select_from(UserAchievement).where(
                    UserAchievement.user_id == user_id
                )
            )
            return result.scalar_one() > 0

    # ── Guides ────────────────────────────────────────────────────────────────

    async def create_guide(
        self,
        user_id: int,
        external_app_id: int,
        title: str,
        s3_key: str,
        description: str | None = None,
        header_image_s3_key: str | None = None,
    ) -> Guide:
        async with self._session() as session:
            game_result = await session.execute(
                select(Game).where(Game.external_app_id == external_app_id)
            )
            game = game_result.scalar_one_or_none()
            if not game:
                from src.models.errors import GameNotFoundError
                raise GameNotFoundError(f"Game {external_app_id} not found")
            guide = Guide(
                user_id=user_id,
                game_id=game.id,
                title=title,
                description=description,
                s3_key=s3_key,
                header_image_s3_key=header_image_s3_key,
            )
            session.add(guide)
            await session.commit()
            result = await session.execute(
                select(Guide).options(selectinload(Guide.game)).where(Guide.id == guide.id)
            )
            return result.scalar_one()

    async def update_guide(
        self,
        guide_id: int,
        user_id: int,
        title: str | None = None,
        description: str | None = None,
        header_image_s3_key: str | None = None,
    ) -> Guide:
        async with self._session() as session:
            result = await session.execute(
                select(Guide).options(selectinload(Guide.game)).where(Guide.id == guide_id)
            )
            guide = result.scalar_one_or_none()
            if not guide:
                raise GuideNotFoundError(f"Guide {guide_id} not found")
            if guide.user_id != user_id:
                raise GuideForbiddenError("You do not own this guide")
            if title is not None:
                guide.title = title
            if description is not None:
                guide.description = description
            if header_image_s3_key is not None:
                guide.header_image_s3_key = header_image_s3_key
            guide.updated_at = datetime.now(timezone.utc)
            await session.commit()
            return guide

    async def get_guides_for_game(
        self, external_app_id: int, user_id: int | None = None
    ) -> list[dict]:
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT gu.id, gu.user_id, gu.title, gu.description,
                           gu.s3_key, gu.header_image_s3_key,
                           gu.created_at, gu.updated_at,
                           g.external_app_id AS app_id, g.name AS game_name,
                           (gf.guide_id IS NOT NULL) AS is_favorite,
                           (
                               SELECT COUNT(*)
                               FROM user_achievements ua
                               JOIN achievements a ON a.id = ua.achievement_id
                               WHERE ua.user_id = gu.user_id
                                 AND a.game_id = gu.game_id
                           ) AS author_achievement_count,
                           (
                               SELECT COUNT(*)
                               FROM achievements a2
                               WHERE a2.game_id = gu.game_id
                           ) AS game_total_achievements
                    FROM guides gu
                    JOIN games g ON g.id = gu.game_id
                    LEFT JOIN guide_favorites gf
                           ON gf.guide_id = gu.id AND gf.user_id = :user_id
                    WHERE g.external_app_id = :app_id
                    ORDER BY gu.created_at DESC
                """),
                {"app_id": external_app_id, "user_id": user_id},
            )
            return [dict(row._mapping) for row in result]

    async def get_owned_app_ids(self, user_id: int) -> list[int]:
        """Returns external_app_ids of all games the user has at least one achievement in."""
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT DISTINCT g.external_app_id
                    FROM user_achievements ua
                    JOIN achievements a ON a.id = ua.achievement_id
                    JOIN games g ON g.id = a.game_id
                    WHERE ua.user_id = :user_id
                """),
                {"user_id": user_id},
            )
            return [row[0] for row in result]

    async def get_games_by_app_ids(self, app_ids: list[int]) -> list[dict]:
        """Returns game details for the given external_app_ids."""
        if not app_ids:
            return []
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT g.external_app_id AS app_id, g.name, g.header_image_url,
                           g.description, g.tags, COUNT(a.id) AS achievement_count
                    FROM games g
                    LEFT JOIN achievements a ON a.game_id = g.id
                    WHERE g.external_app_id = ANY(:app_ids)
                    GROUP BY g.id
                """),
                {"app_ids": app_ids},
            )
            return [dict(row._mapping) for row in result]

    async def get_all_games_paginated(self, limit: int, offset: int) -> list[dict]:
        """Returns paginated game details for embedding generation."""
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT g.external_app_id AS app_id, g.name, g.header_image_url,
                           g.description, g.tags, COUNT(a.id) AS achievement_count
                    FROM games g
                    LEFT JOIN achievements a ON a.game_id = g.id
                    GROUP BY g.id
                    ORDER BY g.id
                    LIMIT :limit OFFSET :offset
                """),
                {"limit": limit, "offset": offset},
            )
            return [dict(row._mapping) for row in result]

    async def get_user_game_completion(self, user_id: int) -> list[dict]:
        """Returns [{app_id, completion_pct}] for all games the user has played."""
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT g.external_app_id AS app_id,
                           CASE WHEN COUNT(a.id) = 0 THEN 0.0
                                ELSE COUNT(ua.achievement_id)::float / COUNT(a.id) * 100
                           END AS completion_pct
                    FROM games g
                    JOIN achievements a ON a.game_id = g.id
                    LEFT JOIN user_achievements ua
                        ON ua.achievement_id = a.id AND ua.user_id = :user_id
                    WHERE EXISTS (
                        SELECT 1 FROM user_achievements ua2
                        JOIN achievements a2 ON a2.id = ua2.achievement_id
                        WHERE ua2.user_id = :user_id AND a2.game_id = g.id
                    )
                    GROUP BY g.id
                """),
                {"user_id": user_id},
            )
            return [dict(row._mapping) for row in result]

    async def get_user_achievement_breakdown(self, user_id: int) -> dict:
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE a.global_unlock_percent < 2)   AS legendary,
                        COUNT(*) FILTER (WHERE a.global_unlock_percent >= 2  AND a.global_unlock_percent < 10)  AS rare,
                        COUNT(*) FILTER (WHERE a.global_unlock_percent >= 10 AND a.global_unlock_percent < 25)  AS uncommon,
                        COUNT(*) FILTER (WHERE a.global_unlock_percent >= 25) AS common
                    FROM user_achievements ua
                    JOIN achievements a ON a.id = ua.achievement_id
                    WHERE ua.user_id = :user_id
                """),
                {"user_id": user_id},
            )
            row = result.one()
            perfect_result = await session.execute(
                text("""
                    SELECT COUNT(*) FROM (
                        SELECT a.game_id
                        FROM user_achievements ua
                        JOIN achievements a ON a.id = ua.achievement_id
                        WHERE ua.user_id = :user_id
                        GROUP BY a.game_id
                        HAVING COUNT(*) = (
                            SELECT COUNT(*) FROM achievements a2 WHERE a2.game_id = a.game_id
                        ) AND COUNT(*) > 0
                    ) AS perfect_games
                """),
                {"user_id": user_id},
            )
            return {
                "perfect": perfect_result.scalar_one(),
                "legendary": row.legendary or 0,
                "rare": row.rare or 0,
                "uncommon": row.uncommon or 0,
                "common": row.common or 0,
                "total": row.total or 0,
            }

    async def get_user_guides(self, user_id: int, viewer_id: int | None = None) -> list[dict]:
        async with self._session() as session:
            result = await session.execute(
                text("""
                    SELECT gu.id, gu.user_id, gu.title, gu.description,
                           gu.s3_key, gu.header_image_s3_key,
                           gu.created_at, gu.updated_at,
                           g.external_app_id AS app_id, g.name AS game_name,
                           (gf.guide_id IS NOT NULL) AS is_favorite,
                           (
                               SELECT COUNT(*)
                               FROM user_achievements ua
                               JOIN achievements a ON a.id = ua.achievement_id
                               WHERE ua.user_id = gu.user_id
                                 AND a.game_id = gu.game_id
                           ) AS author_achievement_count,
                           (
                               SELECT COUNT(*)
                               FROM achievements a2
                               WHERE a2.game_id = gu.game_id
                           ) AS game_total_achievements
                    FROM guides gu
                    JOIN games g ON g.id = gu.game_id
                    LEFT JOIN guide_favorites gf
                           ON gf.guide_id = gu.id AND gf.user_id = :viewer_id
                    WHERE gu.user_id = :user_id
                    ORDER BY gu.created_at DESC
                """),
                {"user_id": user_id, "viewer_id": viewer_id},
            )
            return [dict(row._mapping) for row in result]

    async def add_guide_favorite(self, user_id: int, guide_id: int) -> None:
        async with self._session() as session:
            result = await session.execute(
                select(Guide).where(Guide.id == guide_id)
            )
            if not result.scalar_one_or_none():
                raise GuideNotFoundError(f"Guide {guide_id} not found")
            existing = await session.execute(
                select(GuideFavorite).where(
                    GuideFavorite.user_id == user_id,
                    GuideFavorite.guide_id == guide_id,
                )
            )
            if existing.scalar_one_or_none():
                raise GuideFavoriteAlreadyExistsError()
            session.add(GuideFavorite(user_id=user_id, guide_id=guide_id))
            await session.commit()

    async def remove_guide_favorite(self, user_id: int, guide_id: int) -> None:
        async with self._session() as session:
            result = await session.execute(
                select(GuideFavorite).where(
                    GuideFavorite.user_id == user_id,
                    GuideFavorite.guide_id == guide_id,
                )
            )
            favorite = result.scalar_one_or_none()
            if not favorite:
                raise GuideFavoriteNotFoundError()
            await session.delete(favorite)
            await session.commit()

    async def delete_user_platform_data(self, user_id: int) -> None:
        async with self._session() as session:
            await session.execute(
                text("DELETE FROM user_achievements WHERE user_id = :uid"),
                {"uid": user_id},
            )
            await session.execute(
                text("DELETE FROM user_milestones WHERE user_id = :uid"),
                {"uid": user_id},
            )
            await session.execute(
                text("DELETE FROM user_profile_stats WHERE user_id = :uid"),
                {"uid": user_id},
            )
            await session.commit()
