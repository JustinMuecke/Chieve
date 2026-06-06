
from fastapi import APIRouter, Depends, HTTPException
from src.dependencies import get_current_user_id, get_services
from src.models.schemas import AvatarOption, SelectAvatarRequest, UploadUrlResponse, UserProfile

router = APIRouter(prefix="/me")


@router.get("", response_model=UserProfile)
async def get_me(
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    user = await services.postgres.get_user_with_linked_accounts(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    options = []
    if user.github_avatar_url:
        options.append(AvatarOption(source="github", url=user.github_avatar_url))
    for account in user.linked_accounts:
        if account.avatar_url:
            options.append(AvatarOption(source=account.platform, url=account.avatar_url))

    return UserProfile(
        id=user.id,
        username=user.username,
        email=user.email,
        avatar_url=user.avatar_url,
        avatar_options=options,
        linked_platforms=[a.platform for a in user.linked_accounts],
    )


@router.delete("/platforms/{platform}", status_code=204)
async def unlink_platform(
    platform: str,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    await services.postgres.delete_linked_account(user_id, platform)


@router.put("/avatar", status_code=204)
async def select_avatar(
    body: SelectAvatarRequest,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    user = await services.postgres.get_user_with_linked_accounts(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.source == "github":
        if not user.github_avatar_url:
            raise HTTPException(status_code=400, detail="GitHub avatar not available")
        await services.postgres.update_user_avatar(user_id, user.github_avatar_url)

    elif body.source == "steam":
        steam = next((a for a in user.linked_accounts if a.platform == "steam"), None)
        if not steam or not steam.avatar_url:
            raise HTTPException(status_code=400, detail="Steam avatar not available")
        await services.postgres.update_user_avatar(user_id, steam.avatar_url)

    elif body.source == "custom":
        key = services.s3.avatar_key(user_id, "custom")
        url = services.s3.avatar_proxy_url(key)
        await services.postgres.update_user_avatar(user_id, url)

    else:
        raise HTTPException(status_code=400, detail=f"Unknown source '{body.source}'")


@router.post("/avatar/upload", response_model=UploadUrlResponse)
async def get_upload_url(
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    key = services.s3.avatar_key(user_id, "custom")
    upload_url = await services.s3.get_presigned_put_url(key)
    return UploadUrlResponse(upload_url=upload_url, key=key)
