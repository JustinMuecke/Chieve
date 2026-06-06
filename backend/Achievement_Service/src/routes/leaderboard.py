from fastapi import APIRouter, Depends, HTTPException, Query

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.errors import UserServiceError
from src.models.schemas import LeaderboardEntry, LeaderboardResponse

router = APIRouter(prefix="/leaderboard")

PAGE_SIZE = 25


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    scope: str = Query("global", pattern="^(global|friends)$"),
    sort_by: str = Query("global_points", pattern="^(global_points|community_points)$"),
    page: int = Query(1, ge=1),
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        if scope == "friends":
            following = await services.user_client.get_following(user_id)
            user_ids = [u.id for u in following] + [user_id]
            rows, total = await services.postgres.get_leaderboard_friends(
                user_ids=user_ids, sort_by=sort_by, page=page, page_size=PAGE_SIZE
            )
            # include self in map; following list won't contain self
            self_users = await services.user_client.get_users_by_ids([user_id])
            user_map = {u.id: u for u in following + self_users}
        else:
            rows, total = await services.postgres.get_leaderboard_global(
                sort_by=sort_by, page=page, page_size=PAGE_SIZE
            )
            page_user_ids = [row["user_id"] for row in rows]
            page_users = await services.user_client.get_users_by_ids(page_user_ids)
            user_map = {u.id: u for u in page_users}
    except UserServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))

    entries = []
    for row in rows:
        uid = row["user_id"]
        profile = user_map.get(uid)
        entries.append(LeaderboardEntry(
            rank=row["rank"],
            user_id=uid,
            username=profile.username if profile else f"user_{uid}",
            avatar_url=profile.avatar_url if profile else None,
            total_achievements=row["total_achievements"],
            total_global_points=row["total_global_points"],
            total_community_points=row["total_community_points"],
        ))

    return LeaderboardResponse(
        scope=scope,
        sort_by=sort_by,
        page=page,
        page_size=PAGE_SIZE,
        total=total,
        entries=entries,
    )
