from fastapi import Depends, HTTPException, Request

from src.models.errors import TokenExpiredError, TokenInvalidError
from src.dependencies.services import get_services


def get_current_user_id(request: Request, services=Depends(get_services)) -> int:
    token = request.cookies.get("auth_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return services.auth.decode_token(token)
    except TokenExpiredError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except TokenInvalidError as e:
        raise HTTPException(status_code=401, detail=str(e))
