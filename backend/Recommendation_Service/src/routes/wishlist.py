from fastapi import APIRouter, Depends, HTTPException

from src.dependencies.auth import get_current_user_id
from src.dependencies.services import get_services
from src.models.errors import AchievementServiceError, WishlistAlreadyExistsError, WishlistNotFoundError
from src.models.schemas import WishlistResponse

router = APIRouter()


@router.get("/wishlist", response_model=WishlistResponse)
async def get_wishlist(
    user_id: int = Depends(get_current_user_id),
    services=Depends(get_services),
):
    try:
        items = await services.wishlist.get_wishlist(
            user_id=user_id,
            postgres=services.postgres,
            achievement_client=services.achievement_client,
        )
    except AchievementServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return WishlistResponse(items=items)


@router.post("/wishlist/{app_id}", status_code=201)
async def add_to_wishlist(
    app_id: int,
    user_id: int = Depends(get_current_user_id),
    services=Depends(get_services),
):
    try:
        await services.postgres.add_to_wishlist(user_id, app_id)
    except WishlistAlreadyExistsError:
        raise HTTPException(status_code=409, detail="Game already in wishlist")


@router.delete("/wishlist/{app_id}", status_code=204)
async def remove_from_wishlist(
    app_id: int,
    user_id: int = Depends(get_current_user_id),
    services=Depends(get_services),
):
    try:
        await services.postgres.remove_from_wishlist(user_id, app_id)
    except WishlistNotFoundError:
        raise HTTPException(status_code=404, detail="Game not in wishlist")
