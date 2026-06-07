from fastapi import APIRouter, Depends, HTTPException, Query

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.errors import AchievementServiceError
from src.models.schemas import RecommendationsResponse

router = APIRouter()


@router.get("", response_model=RecommendationsResponse)
async def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    user_id: int = Depends(get_current_user_id),
    services=Depends(get_services),
):
    try:
        return await services.recommendation.get_recommendations(
            user_id=user_id,
            limit=limit,
            postgres=services.postgres,
            achievement_client=services.achievement_client,
        )
    except AchievementServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/dismiss/{app_id}", status_code=204)
async def dismiss_game(
    app_id: int,
    user_id: int = Depends(get_current_user_id),
    services=Depends(get_services),
):
    await services.postgres.add_dismissal(user_id, app_id)
