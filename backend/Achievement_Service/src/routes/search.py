from fastapi import APIRouter, Depends, Query

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.schemas import AchievementSearchResult

router = APIRouter(prefix="/search")


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
