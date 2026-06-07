import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.errors import UserServiceError
from src.models.schemas import FeedAchievement, FeedGame, FeedGuide, FeedResponse, FeedUserEntry

router = APIRouter(prefix="/feed")


@router.get("", response_model=FeedResponse)
async def get_feed(
    days: int = Query(14, ge=1, le=90),
    limit_per_user: int | None = Query(None, ge=1, le=100),
    app_id: int | None = Query(None),
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        following = await services.user_client.get_following(user_id)
    except UserServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not following:
        return FeedResponse(generated_at=datetime.now(timezone.utc), days=days, entries=[])

    since = datetime.now(timezone.utc) - timedelta(days=days)
    following_ids = [u.id for u in following]
    user_map = {u.id: u for u in following}

    ach_rows, guide_rows = await asyncio.gather(
        services.postgres.get_feed_entries(
            user_ids=following_ids, since=since,
            limit_per_user=limit_per_user, app_id=app_id,
        ),
        services.postgres.get_feed_guides(
            user_ids=following_ids, since=since, app_id=app_id,
        ),
    )

    # Group achievement rows: user_id → external_app_id → rows
    ach_grouped: dict[int, dict[int, list]] = {}
    game_meta: dict[int, dict] = {}
    for row in ach_rows:
        uid = row["user_id"]
        aid = row["external_app_id"]
        ach_grouped.setdefault(uid, {}).setdefault(aid, []).append(row)
        if aid not in game_meta:
            game_meta[aid] = {"name": row["game_name"], "header_image_url": row["header_image_url"]}

    # Group guide rows: user_id → rows
    guide_grouped: dict[int, list] = {}
    for row in guide_rows:
        guide_grouped.setdefault(row["user_id"], []).append(row)

    entries = []
    for uid in set(ach_grouped) | set(guide_grouped):
        profile = user_map.get(uid)
        game_entries = [
            FeedGame(
                app_id=aid,
                name=game_meta[aid]["name"],
                header_image_url=game_meta[aid]["header_image_url"],
                achievements=[
                    FeedAchievement(
                        api_name=r["api_name"],
                        display_name=r["display_name"],
                        icon_url=r["icon_url"],
                        global_points=r["global_points"],
                        unlocked_at=r["unlocked_at"],
                    )
                    for r in rows
                ],
            )
            for aid, rows in ach_grouped.get(uid, {}).items()
        ]
        guide_entries = [
            FeedGuide(
                guide_id=r["id"],
                title=r["title"],
                description=r.get("description"),
                game_name=r["game_name"],
                app_id=r["app_id"],
                published_at=r["created_at"],
            )
            for r in guide_grouped.get(uid, [])
        ]
        entries.append(FeedUserEntry(
            user_id=uid,
            username=profile.username if profile else f"user_{uid}",
            avatar_url=profile.avatar_url if profile else None,
            games=game_entries,
            guides=guide_entries,
        ))

    return FeedResponse(
        generated_at=datetime.now(timezone.utc),
        days=days,
        entries=entries,
    )
