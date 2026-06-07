import asyncio
import os

from src.worker.celery_app import celery_app
from src.services.postgres_service import PostgresService
from src.services.milestone_service import MilestoneService
from src.services.steam_api_service import SteamApiService
from src.services.user_service_client import UserServiceClient
from src.services.platforms.dispatcher import get_platform_service
from src.models.errors import UserServiceError


def _make_postgres() -> PostgresService:
    return PostgresService(
        host=os.getenv("POSTGRES_HOST"),
        username=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        database=os.getenv("POSTGRES_DB"),
    )


@celery_app.task(bind=True, name="platform_sync")
def platform_sync_task(self, user_id: int):
    asyncio.run(_platform_sync(self, user_id))


async def _platform_sync(task, user_id: int):
    pg = _make_postgres()
    milestone_svc = MilestoneService(postgres=pg)
    user_client = UserServiceClient()

    try:
        linked_platforms = await user_client.get_linked_platforms(user_id)
    except UserServiceError as e:
        raise RuntimeError(f"Could not fetch linked platforms: {e}") from e

    if not linked_platforms:
        await pg.upsert_profile_stats(user_id)
        return {"status": "no_platforms_linked", "games_processed": 0}

    total_games = 0
    for link in linked_platforms:
        platform_name = link["platform"]
        platform_user_id = link["platform_user_id"]

        service = get_platform_service(platform_name)
        if service is None:
            continue  # unsupported platform — skip silently

        def progress_callback(pct: int):
            task.update_state(
                state="STARTED",
                meta={"platform": platform_name, "progress": pct},
            )

        result = await service.sync_user(
            user_id=user_id,
            platform_user_id=platform_user_id,
            postgres=pg,
            milestone_svc=milestone_svc,
            progress_callback=progress_callback,
        )
        total_games += result.get("games_processed", 0)

    await pg.upsert_profile_stats(user_id)
    return {"status": "complete", "games_processed": total_games}


@celery_app.task(name="backfill_game_descriptions")
def backfill_game_descriptions_task():
    asyncio.run(_backfill_game_descriptions())


async def _backfill_game_descriptions():
    """Fetches store descriptions for all games that still have description=NULL.
    Runs 1 request per second to avoid Steam rate limits."""
    pg = _make_postgres()
    api = SteamApiService()

    app_ids = await pg.get_games_missing_descriptions()
    for app_id in app_ids:
        try:
            store = await api.get_store_details(app_id)
            if store:
                await pg.update_game_store_details(app_id, **store)
        except Exception:
            pass
        await asyncio.sleep(1.0)


@celery_app.task(name="backfill_game_tags")
def backfill_game_tags_task():
    asyncio.run(_backfill_game_tags())


async def _backfill_game_tags():
    """Fetches rich user-defined tags from SteamSpy for all games. 1 req/sec."""
    pg = _make_postgres()
    api = SteamApiService()

    app_ids = await pg.get_all_game_app_ids()
    for app_id in app_ids:
        try:
            tags = await api.get_steamspy_tags(app_id)
            if tags:
                await pg.update_game_store_details(app_id, description=None, tags=tags)
        except Exception:
            pass
        await asyncio.sleep(1.0)


@celery_app.task(name="refresh_community_points")
def refresh_community_points_task():
    asyncio.run(_refresh_community_points())


async def _refresh_community_points():
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    url = (
        f"postgresql+asyncpg://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}"
        f"@{os.getenv('POSTGRES_HOST')}/{os.getenv('POSTGRES_DB')}"
    )
    engine = create_async_engine(url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        await session.execute(
            text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_community_points")
        )
        await session.execute(
            text("""
                INSERT INTO user_profile_stats (user_id, total_community_points, updated_at)
                SELECT
                    ua.user_id,
                    COALESCE(SUM(mv.community_points), 0),
                    NOW()
                FROM user_achievements ua
                JOIN mv_community_points mv ON mv.achievement_id = ua.achievement_id
                GROUP BY ua.user_id
                ON CONFLICT (user_id) DO UPDATE
                    SET total_community_points = EXCLUDED.total_community_points,
                        updated_at = EXCLUDED.updated_at
            """)
        )
        await session.commit()

    await engine.dispose()
