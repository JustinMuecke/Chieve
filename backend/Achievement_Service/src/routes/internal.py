from fastapi import APIRouter, Depends, HTTPException

from src.dependencies.service_auth import get_calling_service
from src.dependencies.services import get_services
from src.models.schemas import UserAchievementBreakdown

router = APIRouter(prefix="/internal")


@router.get("/users/{user_id}/achievement-breakdown", response_model=UserAchievementBreakdown)
async def get_achievement_breakdown(
    user_id: int,
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    breakdown = await services.postgres.get_user_achievement_breakdown(user_id)
    return UserAchievementBreakdown(**breakdown)
