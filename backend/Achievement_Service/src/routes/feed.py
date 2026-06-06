from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.errors import UserServiceError
from src.models.schemas import FeedAchievement, FeedGame, FeedResponse, FeedUserEntry

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
        return FeedResponse(
            generated_at=datetime.now(timezone.utc),
            days=days,
            entries=[],
        )

    since = datetime.now(timezone.utc) - timedelta(days=days)
    following_ids = [u.id for u in following]
    rows = await services.postgres.get_feed_entries(
        user_ids=following_ids,
        since=since,
        limit_per_user=limit_per_user,
        app_id=app_id,
    )

    # Group rows: user_id → app_id → achievements
    user_map = {u.id: u for u in following}
    grouped: dict[int, dict[int, list]] = {}
    game_meta: dict[int, dict] = {}

    for row in rows:
        uid = row["user_id"]
        app_id = row["external_app_id"]
        grouped.setdefault(uid, {}).setdefault(app_id, [])
        grouped[uid][app_id].append(row)
        if app_id not in game_meta:
            game_meta[app_id] = {
                "name": row["game_name"],
                "header_image_url": row["header_image_url"],
            }

    entries = []
    for uid, games in grouped.items():
        profile = user_map.get(uid)
        game_entries = []
        for app_id, ach_rows in games.items():
            meta = game_meta[app_id]
            achievements = [
                FeedAchievement(
                    api_name=r["api_name"],
                    display_name=r["display_name"],
                    icon_url=r["icon_url"],
                    global_points=r["global_points"],
                    unlocked_at=r["unlocked_at"],
                )
                for r in ach_rows
            ]
            game_entries.append(FeedGame(
                app_id=app_id,
                name=meta["name"],
                header_image_url=meta["header_image_url"],
                achievements=achievements,
            ))
        entries.append(FeedUserEntry(
            user_id=uid,
            username=profile.username if profile else f"user_{uid}",
            avatar_url=profile.avatar_url if profile else None,
            games=game_entries,
        ))

    return FeedResponse(
        generated_at=datetime.now(timezone.utc),
        days=days,
        entries=entries,
    )
