from fastapi import Depends, HTTPException, Request

from src.models.errors import TokenExpiredError, TokenInvalidError
from src.dependencies.services import get_services


def get_calling_service(request: Request, services=Depends(get_services)) -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing service token")
    token = auth_header.removeprefix("Bearer ")
    try:
        return services.auth.decode_service_token(token)
    except (TokenExpiredError, TokenInvalidError) as e:
        raise HTTPException(status_code=401, detail=str(e))
