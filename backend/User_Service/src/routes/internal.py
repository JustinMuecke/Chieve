from fastapi import APIRouter, Depends, HTTPException, Query

from src.dependencies.service_auth import get_calling_service
from src.dependencies.services import get_services
from src.models.schemas import FullUserProfile, UserSummary

router = APIRouter(prefix="/internal")


@router.get("/following/{user_id}", response_model=list[UserSummary])
async def get_following_for_service(
    user_id: int,
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    """Returns the following list for a user — id, username, avatar_url."""
    user = await services.postgres.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    users = await services.postgres.get_following(user_id)
    return [UserSummary(id=u.id, username=u.username, avatar_url=u.avatar_url) for u in users]


@router.get("/linked-platforms/{user_id}")
async def get_linked_platforms(
    user_id: int,
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    """Returns [{platform, platform_user_id}] for a user — used by sync dispatcher."""
    user = await services.postgres.get_user_with_linked_accounts(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return [
        {"platform": a.platform, "platform_user_id": a.platform_user_id}
        for a in user.linked_accounts
    ]


@router.get("/users", response_model=list[UserSummary])
async def get_users_by_ids(
    ids: str = Query(..., description="Comma-separated user IDs"),
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    """Bulk user lookup by IDs — id, username, avatar_url."""
    try:
        user_ids = [int(i) for i in ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="ids must be comma-separated integers")
    users = await services.postgres.get_users_by_ids(user_ids)
    return [UserSummary(id=u.id, username=u.username, avatar_url=u.avatar_url) for u in users]


@router.get("/users/search", response_model=list[UserSummary])
async def search_users(
    q: str = Query(..., min_length=2),
    limit: int = Query(5, ge=1, le=20),
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    users = await services.postgres.search_users(q, limit)
    return [UserSummary(id=u.id, username=u.username, avatar_url=u.avatar_url) for u in users]


@router.get("/users/{user_id}/social-profile", response_model=FullUserProfile)
async def get_user_social_profile(
    user_id: int,
    viewer_id: int | None = Query(None),
    services=Depends(get_services),
    _service: str = Depends(get_calling_service),
):
    """Full profile data + social counts for a user, from the perspective of viewer_id."""
    user = await services.postgres.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    social = await services.postgres.get_user_social_stats(user_id, viewer_id)
    return FullUserProfile(
        id=user.id,
        username=user.username,
        avatar_url=user.avatar_url,
        banner_url=user.banner_url,
        description=user.description,
        **social,
    )
