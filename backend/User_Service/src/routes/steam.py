from fastapi import APIRouter, Request, Depends, HTTPException
from src.dependencies import get_current_user_id, get_services
from src.models.errors import SteamAuthError, SteamStateError

router = APIRouter(prefix="/steam")


@router.get("/link")
def link(services=Depends(get_services), user_id: int = Depends(get_current_user_id)):
    return services.steam.link()


@router.get("/callback")
async def callback(
    request: Request,
    services=Depends(get_services),
    user_id: int = Depends(get_current_user_id),
):
    try:
        return await services.steam.callback(request, user_id)
    except SteamStateError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except SteamAuthError as e:
        raise HTTPException(status_code=400, detail=str(e))
