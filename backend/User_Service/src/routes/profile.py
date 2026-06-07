from fastapi import APIRouter, Depends, HTTPException

from src.dependencies.auth import get_optional_user_id
from src.dependencies.services import get_services
from src.models.errors import AchievementServiceError
from src.models.schemas import AchievementBreakdown, UserProfileResponse

router = APIRouter(prefix="/profile")


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: int,
    services=Depends(get_services),
    viewer_id: int | None = Depends(get_optional_user_id),
):
    user = await services.postgres.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    social = await services.postgres.get_user_social_stats(user_id, viewer_id)

    try:
        breakdown = await services.achievement_client.get_achievement_breakdown(user_id)
    except AchievementServiceError:
        breakdown = {"perfect": 0, "legendary": 0, "rare": 0, "uncommon": 0, "common": 0, "total": 0}

    return UserProfileResponse(
        user_id=user.id,
        username=user.username,
        avatar_url=user.avatar_url,
        banner_url=user.banner_url,
        description=user.description,
        followers_count=social["followers_count"],
        following_count=social["following_count"],
        is_own_profile=viewer_id == user_id if viewer_id is not None else False,
        is_following=social["is_following"],
        achievements=AchievementBreakdown(**breakdown),
    )
