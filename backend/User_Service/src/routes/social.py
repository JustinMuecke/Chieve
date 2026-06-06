from fastapi import APIRouter, Depends, HTTPException

from src.dependencies import get_current_user_id, get_services
from src.models.errors import SelfFollowError, UserNotFoundError
from src.models.schemas import UserSummary

router = APIRouter(prefix="/social")


@router.post("/follow/{target_id}", status_code=204)
async def follow_user(
    target_id: int,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    if user_id == target_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    target = await services.postgres.get_user_by_id(target_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await services.postgres.follow(follower_id=user_id, following_id=target_id)


@router.delete("/follow/{target_id}", status_code=204)
async def unfollow_user(
    target_id: int,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    removed = await services.postgres.unfollow(follower_id=user_id, following_id=target_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Not following this user")


@router.get("/following", response_model=list[UserSummary])
async def get_following(
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    users = await services.postgres.get_following(user_id)
    return [UserSummary(id=u.id, username=u.username, avatar_url=u.avatar_url) for u in users]


@router.get("/followers", response_model=list[UserSummary])
async def get_followers(
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    users = await services.postgres.get_followers(user_id)
    return [UserSummary(id=u.id, username=u.username, avatar_url=u.avatar_url) for u in users]
