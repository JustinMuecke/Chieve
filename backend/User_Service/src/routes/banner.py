from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from src.dependencies.services import get_services

router = APIRouter(prefix="/banner")


@router.get("/{user_id}")
async def proxy_banner(user_id: int, services=Depends(get_services)):
    key = services.s3.banner_key(user_id)
    try:
        body, content_type = await services.s3.get_object(key)
    except Exception:
        raise HTTPException(status_code=404, detail="Banner not found")
    return Response(content=body, media_type=content_type)
