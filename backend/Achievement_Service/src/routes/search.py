import asyncio

from fastapi import APIRouter, Depends, Query

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.errors import UserServiceError
from src.models.schemas import AchievementSearchResult, GameSearchResult, GlobalSearchResponse, UserSummary

router = APIRouter(prefix="/search")


@router.get("/global", response_model=GlobalSearchResponse)
async def global_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(5, ge=1, le=20),
    services=Depends(get_services),
    _user_id: int = Depends(get_current_user_id),
):
    games_result, users_result = await asyncio.gather(
        services.postgres.get_all_games(q=q, page=1, page_size=limit),
        services.user_client.search_users(q, limit),
        return_exceptions=True,
    )

    game_rows = games_result[0] if not isinstance(games_result, Exception) else []
    user_list = users_result if not isinstance(users_result, Exception) else []

    return GlobalSearchResponse(
        games=[
            GameSearchResult(
                app_id=row["external_app_id"],
                name=row["name"],
                header_image_url=row["header_image_url"],
            )
            for row in game_rows
        ],
        users=[
            UserSummary(id=u.id, username=u.username, avatar_url=u.avatar_url)
            for u in user_list
        ],
    )


@router.get("", response_model=list[AchievementSearchResult])
async def search_achievements(
    q: str = Query(..., min_length=2),
    game_id: int | None = Query(None),
    max_rarity: float | None = Query(None, ge=0.0, le=100.0),
    limit: int = Query(25, ge=1, le=100),
    services=Depends(get_services),
    _user_id: int = Depends(get_current_user_id),
):
    rows = await services.postgres.search_achievements(
        query=q, game_id=game_id, max_rarity=max_rarity, limit=limit
    )
    return [
        AchievementSearchResult(
            achievement_id=r["achievement_id"],
            api_name=r["api_name"],
            display_name=r["display_name"],
            description=r["description"],
            icon_url=r["icon_url"],
            global_unlock_percent=float(r["global_unlock_percent"]) if r["global_unlock_percent"] is not None else None,
            global_points=r["global_points"],
            app_id=r["app_id"],
            game_name=r["game_name"],
        )
        for r in rows
    ]
