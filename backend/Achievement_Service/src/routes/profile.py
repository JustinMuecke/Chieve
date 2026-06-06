from fastapi import APIRouter, Depends

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.schemas import UserStats

router = APIRouter(prefix="/profile")


@router.get("", response_model=UserStats)
async def get_own_profile(
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    stats = await services.postgres.get_profile_stats(user_id)
    if not stats:
        return UserStats(
            user_id=user_id,
            total_achievements=0,
            total_global_points=0,
            total_community_points=0,
            updated_at=None,
        )
    return UserStats(
        user_id=stats.user_id,
        total_achievements=stats.total_achievements,
        total_global_points=stats.total_global_points,
        total_community_points=stats.total_community_points,
        updated_at=stats.updated_at,
    )


@router.get("/{user_id}", response_model=UserStats)
async def get_user_profile(
    user_id: int,
    services=Depends(get_services),
):
    stats = await services.postgres.get_profile_stats(user_id)
    if not stats:
        return UserStats(
            user_id=user_id,
            total_achievements=0,
            total_global_points=0,
            total_community_points=0,
            updated_at=None,
        )
    return UserStats(
        user_id=stats.user_id,
        total_achievements=stats.total_achievements,
        total_global_points=stats.total_global_points,
        total_community_points=stats.total_community_points,
        updated_at=stats.updated_at,
    )
