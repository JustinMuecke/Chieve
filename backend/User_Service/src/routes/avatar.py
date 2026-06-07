from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from src.dependencies.services import get_services

router = APIRouter(prefix="/avatar")


@router.get("/{user_id}/{source}")
async def proxy_avatar(user_id: int, source: str, services=Depends(get_services)):
    if source not in ("github", "steam", "custom"):
        raise HTTPException(status_code=404, detail="Unknown avatar source")
    key = services.s3.avatar_key(user_id, source)
    try:
        body, content_type = await services.s3.get_object(key)
    except Exception:
        raise HTTPException(status_code=404, detail="Avatar not found")
    return Response(content=body, media_type=content_type)
