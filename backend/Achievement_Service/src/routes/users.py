import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from src.dependencies.auth import get_optional_user_id
from src.dependencies.services import get_services
from src.models.errors import UserServiceError
from src.models.schemas import (
    FeedAchievement,
    FeedGame,
    FeedGuide,
    FeedResponse,
    FeedUserEntry,
    GameSummary,
    GuideResponse,
    UserAchievementBreakdown,
    UserFullProfile,
)

router = APIRouter(prefix="/users")


def _content_url(guide_id: int) -> str:
    return f"/api/achievements/guides/{guide_id}/content"


def _header_url(guide_id: int) -> str:
    return f"/api/achievements/guides/{guide_id}/header"


@router.get("/{user_id}/profile", response_model=UserFullProfile)
async def get_user_profile(
    user_id: int,
    services=Depends(get_services),
    viewer_id: int | None = Depends(get_optional_user_id),
):
    try:
        user_data = await services.user_client.get_user_social_profile(user_id, viewer_id)
    except UserServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    breakdown = await services.postgres.get_user_achievement_breakdown(user_id)

    return UserFullProfile(
        user_id=user_data["id"],
        username=user_data["username"],
        avatar_url=user_data["avatar_url"],
        banner_url=user_data["banner_url"],
        description=user_data["description"],
        followers_count=user_data["followers_count"],
        following_count=user_data["following_count"],
        is_own_profile=viewer_id == user_id if viewer_id is not None else False,
        is_following=user_data["is_following"],
        achievements=UserAchievementBreakdown(**breakdown),
    )


@router.get("/{user_id}/guides", response_model=list[GuideResponse])
async def get_user_guides(
    user_id: int,
    services=Depends(get_services),
    viewer_id: int | None = Depends(get_optional_user_id),
):
    rows = await services.postgres.get_user_guides(user_id, viewer_id)

    try:
        users = await services.user_client.get_users_by_ids([user_id])
    except UserServiceError:
        users = []
    author = users[0] if users else None

    return [
        GuideResponse(
            id=row["id"],
            user_id=row["user_id"],
            username=author.username if author else None,
            author_avatar_url=author.avatar_url if author else None,
            app_id=row["app_id"],
            game_name=row["game_name"],
            title=row["title"],
            description=row.get("description"),
            content_url=_content_url(row["id"]),
            header_image_url=_header_url(row["id"]) if row.get("header_image_s3_key") else None,
            is_favorite=bool(row.get("is_favorite", False)),
            author_achievement_count=row.get("author_achievement_count", 0),
            game_total_achievements=row.get("game_total_achievements", 0),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


@router.get("/{user_id}/games", response_model=list[GameSummary])
async def get_user_games(
    user_id: int,
    services=Depends(get_services),
):
    rows = await services.postgres.get_user_games(user_id)
    result = []
    for row in rows:
        total = row["total_achievements"]
        unlocked = row["unlocked_achievements"]
        result.append(GameSummary(
            app_id=row["external_app_id"],
            name=row["name"],
            header_image_url=row["header_image_url"],
            total_achievements=total,
            unlocked_achievements=unlocked,
            completion_percent=round(unlocked / total * 100, 1) if total else 0.0,
        ))
    return result


@router.get("/{user_id}/feed", response_model=FeedResponse)
async def get_user_feed(
    user_id: int,
    days: int = Query(14, ge=1, le=90),
    limit_per_user: int | None = Query(None, ge=1, le=100),
    services=Depends(get_services),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    ach_rows, guide_rows = await asyncio.gather(
        services.postgres.get_feed_entries(
            user_ids=[user_id], since=since, limit_per_user=limit_per_user,
        ),
        services.postgres.get_feed_guides(user_ids=[user_id], since=since),
    )

    if not ach_rows and not guide_rows:
        return FeedResponse(generated_at=datetime.now(timezone.utc), days=days, entries=[])

    try:
        users = await services.user_client.get_users_by_ids([user_id])
    except UserServiceError:
        users = []
    user_map = {u.id: u for u in users}

    ach_grouped: dict[int, dict[int, list]] = {}
    game_meta: dict[int, dict] = {}
    for row in ach_rows:
        uid = row["user_id"]
        aid = row["external_app_id"]
        ach_grouped.setdefault(uid, {}).setdefault(aid, []).append(row)
        if aid not in game_meta:
            game_meta[aid] = {"name": row["game_name"], "header_image_url": row["header_image_url"]}

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
