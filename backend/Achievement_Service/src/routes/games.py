from fastapi import APIRouter, Depends, HTTPException, Query

from src.dependencies.auth import get_current_user_id, get_optional_user_id
from src.dependencies.services import get_services
from src.models.schemas import AchievementDetail, GameCatalogEntry, GameDetail, GameSummary

router = APIRouter()

_DEFAULT_PAGE_SIZE = 50


@router.get("/games", response_model=dict)
async def list_all_games(
    q: str | None = Query(None, description="Filter by game name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(_DEFAULT_PAGE_SIZE, ge=1, le=200),
    services=Depends(get_services),
):
    rows, total = await services.postgres.get_all_games(q=q, page=page, page_size=page_size)
    entries = [
        GameCatalogEntry(
            app_id=row["external_app_id"],
            name=row["name"],
            header_image_url=row["header_image_url"],
            total_achievements=row["total_achievements"],
        )
        for row in rows
    ]
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "games": [e.model_dump() for e in entries],
    }


@router.get("/games/{app_id}", response_model=GameDetail)
async def get_game(
    app_id: int,
    services=Depends(get_services),
    user_id: int | None = Depends(get_optional_user_id),
):
    data = await services.postgres.get_game_with_user_achievements(user_id, app_id)
    if not data:
        raise HTTPException(status_code=404, detail="Game not found")

    game = data["game"]
    achievements = [
        AchievementDetail(
            api_name=a["api_name"],
            display_name=a["display_name"],
            description=a["description"],
            icon_url=a["icon_url"],
            global_unlock_percent=float(a["global_unlock_percent"]) if a["global_unlock_percent"] is not None else None,
            global_points=a["global_points"],
            unlocked=a["unlocked_at"] is not None,
            unlocked_at=a["unlocked_at"],
        )
        for a in data["achievements"]
    ]
    return GameDetail(
        app_id=game.external_app_id,
        name=game.name,
        header_image_url=game.header_image_url,
        achievements=achievements,
    )


@router.get("/me/games", response_model=list[GameSummary])
async def list_my_games(
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
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
