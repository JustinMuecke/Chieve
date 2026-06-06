from fastapi import APIRouter, Request, Depends, HTTPException
from src.dependencies import get_services
from src.models.errors import GitHubAPIError, OAuthCodeMissingError, OAuthStateError

router = APIRouter(prefix="/auth")


@router.get("/login")
def login(services=Depends(get_services)):
    return services.github_oauth.login()


@router.get("/callback")
async def callback(request: Request, services=Depends(get_services), code: str = None, state: str = None):
    try:
        return await services.github_oauth.callback(request, code, state)
    except OAuthStateError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except OAuthCodeMissingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except GitHubAPIError as e:

        raise HTTPException(status_code=502, detail=str(e))
