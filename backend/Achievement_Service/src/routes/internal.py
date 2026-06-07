from fastapi import APIRouter, Depends, Query

from src.dependencies.service_auth import get_calling_service
from src.dependencies.services import get_services
from src.models.schemas import GameInternalDetail, UserAchievementBreakdown, UserGameCompletion

router = APIRouter(prefix="/internal")


@router.get("/users/{user_id}/achievement-breakdown", response_model=UserAchievementBreakdown)
async def get_achievement_breakdown(
    user_id: int,
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    breakdown = await services.postgres.get_user_achievement_breakdown(user_id)
    return UserAchievementBreakdown(**breakdown)


@router.get("/owned-app-ids/{user_id}", response_model=list[int])
async def get_owned_app_ids(
    user_id: int,
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    return await services.postgres.get_owned_app_ids(user_id)


@router.get("/games", response_model=list[GameInternalDetail])
async def get_games(
    app_ids: str | None = Query(None, description="Comma-separated external app IDs"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    if app_ids:
        ids = [int(x) for x in app_ids.split(",") if x.strip()]
        rows = await services.postgres.get_games_by_app_ids(ids)
    else:
        rows = await services.postgres.get_all_games_paginated(limit, offset)
    return [GameInternalDetail(**r) for r in rows]


@router.get("/user-game-completion/{user_id}", response_model=list[UserGameCompletion])
async def get_user_game_completion(
    user_id: int,
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    rows = await services.postgres.get_user_game_completion(user_id)
    return [UserGameCompletion(**r) for r in rows]


@router.delete("/users/{user_id}/platform-data", status_code=204)
async def delete_user_platform_data(
    user_id: int,
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    await services.postgres.delete_user_platform_data(user_id)
